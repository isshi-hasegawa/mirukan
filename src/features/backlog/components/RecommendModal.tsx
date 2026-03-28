import { useEffect, useState } from "react";
import {
  FilmIcon,
  TvIcon,
  LightBulbIcon,
  BoltIcon,
  EyeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../../../lib/supabase.ts";
import { fetchTmdbTrending } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import type { BacklogItem, WorkSummary } from "../types.ts";

type ViewingMode = "focus" | "thoughtful" | "quick" | "background";
type ActiveTab = "trending" | ViewingMode;

const MODES: {
  id: ViewingMode;
  label: string;
  Icon: React.ComponentType<{ className: string }>;
}[] = [
  { id: "focus", label: "ガッツリ", Icon: FilmIcon },
  { id: "thoughtful", label: "じっくり", Icon: LightBulbIcon },
  { id: "quick", label: "サクッと", Icon: BoltIcon },
  { id: "background", label: "ながら見", Icon: EyeIcon },
];

type SuggestionItem =
  | { source: "backlog"; backlogItem: BacklogItem }
  | { source: "global"; work: WorkSummary }
  | { source: "trending"; result: TmdbSearchResult };

function getSuggestionKey(item: SuggestionItem): string {
  if (item.source === "backlog") return item.backlogItem.id;
  if (item.source === "global") return item.work.id;
  return `${item.result.tmdbMediaType}-${item.result.tmdbId}`;
}

function applyModeFilter(work: WorkSummary, mode: ViewingMode): boolean {
  if (mode === "background") {
    return work.background_fit_score !== null && work.background_fit_score >= 50;
  }

  const duration =
    work.work_type === "movie" ? work.runtime_minutes : work.typical_episode_runtime_minutes;

  if (duration === null) return false;
  if (mode === "focus" && duration < 80) return false;
  if (mode === "thoughtful" && (duration < 40 || duration >= 80)) return false;
  if (mode === "quick" && duration >= 40) return false;

  return true;
}

function filterBacklogItems(items: BacklogItem[], mode: ViewingMode): SuggestionItem[] {
  return items
    .filter((item) => {
      const work = item.works;
      if (!work || work.source_type === "manual" || work.work_type === "season") return false;
      return applyModeFilter(work, mode);
    })
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map((item) => ({ source: "backlog" as const, backlogItem: item }));
}

async function fetchGlobalSuggestions(
  mode: ViewingMode,
  excludeWorkIds: string[],
  limit: number,
): Promise<SuggestionItem[]> {
  let query = supabase
    .from("works")
    .select(
      "id, title, work_type, source_type, tmdb_id, tmdb_media_type, original_title, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, genres, season_count, season_number, focus_required_score, background_fit_score, completion_load_score",
    )
    .eq("source_type", "tmdb")
    .neq("work_type", "season");

  if (excludeWorkIds.length > 0) {
    query = query.not("id", "in", `(${excludeWorkIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as WorkSummary[])
    .filter((work) => applyModeFilter(work, mode))
    .sort(() => Math.random() - 0.5)
    .slice(0, limit)
    .map((work) => ({ source: "global" as const, work }));
}

function RecommendItem({
  item,
  onMove,
}: {
  item: SuggestionItem;
  onMove: (item: SuggestionItem) => void;
}) {
  const [posterError, setPosterError] = useState(false);

  const { title, posterPath, runtime, workType } = (() => {
    if (item.source === "trending") {
      return {
        title: item.result.title,
        posterPath: item.result.posterPath,
        runtime: null,
        workType: item.result.workType,
      };
    }
    const work = item.source === "backlog" ? (item.backlogItem.works as WorkSummary) : item.work;
    return {
      title: work.title,
      posterPath: work.poster_path,
      runtime: work.work_type === "movie" ? (work.runtime_minutes ?? null) : null,
      workType: work.work_type as "movie" | "series",
    };
  })();
  const WorkTypeIcon = workType === "movie" ? FilmIcon : TvIcon;

  const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w92${posterPath}` : null;

  return (
    <li className="recommend-item" onClick={() => onMove(item)}>
      <div className="recommend-item-info">
        <div className="recommend-item-thumb">
          {posterUrl && !posterError ? (
            <img src={posterUrl} alt={title} onError={() => setPosterError(true)} />
          ) : (
            <span className="recommend-item-thumb-fallback">{title.slice(0, 2)}</span>
          )}
        </div>
        <div className="recommend-item-meta">
          <span className="recommend-item-title">{title}</span>
          <span className="recommend-item-runtime">
            <WorkTypeIcon className="work-type-icon" aria-hidden="true" />
            {workType === "movie" ? "映画" : "シリーズ"}
            {runtime != null && ` · ${runtime}分`}
          </span>
        </div>
      </div>
      <button type="button" className="recommend-item-move" title="見たい列に追加">
        見る
      </button>
    </li>
  );
}

type Props = {
  items: BacklogItem[];
  onClose: () => void;
  onMoveToWantToWatch: (itemId: string) => void;
  onAddWorkToWantToWatch: (workId: string) => void;
  onAddTmdbWorkToWantToWatch: (result: TmdbSearchResult) => Promise<void>;
};

export function RecommendModal({
  items,
  onClose,
  onMoveToWantToWatch,
  onAddWorkToWantToWatch,
  onAddTmdbWorkToWantToWatch,
}: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("trending");
  const [globalSuggestions, setGlobalSuggestions] = useState<SuggestionItem[]>([]);
  const [trendingResults, setTrendingResults] = useState<TmdbSearchResult[]>([]);

  const stackedItems = items.filter((item) => item.status === "stacked");
  const localSuggestions =
    activeTab !== "trending" ? filterBacklogItems(stackedItems, activeTab) : [];

  useEffect(() => {
    const itemTmdbKeys = new Set(
      items
        .filter((item) => item.works?.tmdb_id && item.works?.tmdb_media_type)
        .map((item) => `${item.works!.tmdb_media_type}-${item.works!.tmdb_id}`),
    );
    fetchTmdbTrending()
      .then((results) => {
        setTrendingResults(
          results.filter((r) => !itemTmdbKeys.has(`${r.tmdbMediaType}-${r.tmdbId}`)),
        );
      })
      .catch(() => {
        /* non-critical */
      });
  }, []);

  useEffect(() => {
    if (activeTab === "trending") return;
    const globalLimit = 4 - localSuggestions.length;
    const excludeWorkIds = items
      .map((item) => item.works?.id)
      .filter((id): id is string => id !== undefined && id !== null);

    void fetchGlobalSuggestions(activeTab, excludeWorkIds, globalLimit).then(setGlobalSuggestions);
  }, [activeTab, localSuggestions.length, items]);

  const suggestions = [...localSuggestions, ...globalSuggestions];

  const handleMove = (item: SuggestionItem) => {
    if (item.source === "backlog") {
      onMoveToWantToWatch(item.backlogItem.id);
    } else if (item.source === "global") {
      onAddWorkToWantToWatch(item.work.id);
    } else {
      void onAddTmdbWorkToWantToWatch(item.result);
    }
  };

  const renderResults = () => {
    if (activeTab === "trending") {
      const trendingSuggestions: SuggestionItem[] = trendingResults
        .slice(0, 4)
        .map((result) => ({ source: "trending" as const, result }));

      if (trendingSuggestions.length === 0) {
        return <p className="recommend-empty">トレンド情報を読み込み中...</p>;
      }

      return (
        <ul className="recommend-item-list" role="list">
          {trendingSuggestions.map((item) => (
            <RecommendItem key={getSuggestionKey(item)} item={item} onMove={handleMove} />
          ))}
        </ul>
      );
    }

    return suggestions.length === 0 ? (
      <p className="recommend-empty">積みの中に該当する作品がありません</p>
    ) : (
      <ul className="recommend-item-list" role="list">
        {suggestions.map((item) => (
          <RecommendItem key={getSuggestionKey(item)} item={item} onMove={handleMove} />
        ))}
      </ul>
    );
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal-card recommend-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="次何見る？"
      >
        <div className="recommend-modal-body">
          <div className="recommend-filters">
            <div className="recommend-modes">
              <button
                type="button"
                className={`recommend-mode-button${activeTab === "trending" ? " is-active" : ""}`}
                onClick={() => setActiveTab("trending")}
              >
                <SparklesIcon className="recommend-mode-icon" aria-hidden="true" />
                <span className="recommend-mode-label">トレンド</span>
              </button>
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`recommend-mode-button${activeTab === mode.id ? " is-active" : ""}`}
                  onClick={() => setActiveTab(mode.id)}
                >
                  <mode.Icon className="recommend-mode-icon" aria-hidden="true" />
                  <span className="recommend-mode-label">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="recommend-results">{renderResults()}</div>
        </div>
      </section>
    </div>
  );
}
