import { useEffect, useState } from "react";
import { FilmIcon, LightBulbIcon, BoltIcon, EyeIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../../lib/supabase.ts";
import type { BacklogItem, WorkSummary } from "../types.ts";

type ViewingMode = "focus" | "thoughtful" | "quick" | "background";

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
  | { source: "global"; work: WorkSummary };

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
  const work = item.source === "backlog" ? (item.backlogItem.works as WorkSummary) : item.work;
  const title =
    item.source === "backlog" ? (item.backlogItem.display_title ?? work.title) : work.title;
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w92${work.poster_path}` : null;

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
          {work.work_type === "movie" && work.runtime_minutes && (
            <span className="recommend-item-runtime">{work.runtime_minutes}分</span>
          )}
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
};

export function RecommendModal({
  items,
  onClose,
  onMoveToWantToWatch,
  onAddWorkToWantToWatch,
}: Props) {
  const [activeMode, setActiveMode] = useState<ViewingMode>("thoughtful");
  const [globalSuggestions, setGlobalSuggestions] = useState<SuggestionItem[]>([]);

  const stackedItems = items.filter((item) => item.status === "stacked");
  const localSuggestions = filterBacklogItems(stackedItems, activeMode);

  useEffect(() => {
    const globalLimit = 4 - localSuggestions.length;
    const excludeWorkIds = items
      .map((item) => item.works?.id)
      .filter((id): id is string => id !== undefined && id !== null);

    void fetchGlobalSuggestions(activeMode, excludeWorkIds, globalLimit).then(setGlobalSuggestions);
  }, [activeMode, localSuggestions.length, items]);

  const suggestions = [...localSuggestions, ...globalSuggestions];

  const handleMove = (item: SuggestionItem) => {
    if (item.source === "backlog") {
      onMoveToWantToWatch(item.backlogItem.id);
    } else {
      onAddWorkToWantToWatch(item.work.id);
    }
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
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`recommend-mode-button${activeMode === mode.id ? " is-active" : ""}`}
                  onClick={() => setActiveMode(mode.id)}
                >
                  <mode.Icon className="recommend-mode-icon" aria-hidden="true" />
                  <span className="recommend-mode-label">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="recommend-results">
            {suggestions.length === 0 ? (
              <p className="recommend-empty">積みの中に該当する作品がありません</p>
            ) : (
              <ul className="recommend-item-list" role="list">
                {suggestions.map((item) => (
                  <RecommendItem
                    key={item.source === "backlog" ? item.backlogItem.id : item.work.id}
                    item={item}
                    onMove={handleMove}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
