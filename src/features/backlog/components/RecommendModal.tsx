import { useEffect, useState } from "react";
import { FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import { fetchMergedRecommendations } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { platformLabels } from "../constants.ts";
import type { BacklogItem } from "../types.ts";

function RecommendItem({
  result,
  onAddToStacked,
}: {
  result: TmdbSearchResult;
  onAddToStacked: (result: TmdbSearchResult) => void;
}) {
  const posterUrl = result.posterPath
    ? `https://image.tmdb.org/t/p/w185${result.posterPath}`
    : null;

  return (
    <li className="recommend-item">
      <div className="search-result-button recommend-item-info-card">
        <span className="search-result-thumb">
          {posterUrl ? (
            <img src={posterUrl} alt={`${result.title} のポスター`} />
          ) : (
            <span className="search-result-thumb-fallback">{result.title.slice(0, 2)}</span>
          )}
        </span>
        <span className="search-result-content">
          <span className="search-result-title">{result.title}</span>
          <span className="search-result-meta">
            {result.workType === "movie" ? (
              <FilmIcon className="work-type-icon" aria-hidden="true" />
            ) : (
              <TvIcon className="work-type-icon" aria-hidden="true" />
            )}
            {result.workType === "movie" ? "映画" : "シリーズ"}
            {result.releaseDate && ` · ${result.releaseDate.slice(0, 4)}`}
          </span>
          {result.jpWatchPlatforms.length > 0 && (
            <span className="search-result-platforms">
              {result.jpWatchPlatforms.map(({ key, logoPath }) => {
                const label = platformLabels[key as keyof typeof platformLabels];
                if (!label) return null;
                return logoPath ? (
                  <img
                    key={key}
                    src={`https://image.tmdb.org/t/p/w45${logoPath}`}
                    alt={label}
                    title={label}
                    className="search-result-platform-logo"
                  />
                ) : (
                  <span key={key} className="search-result-platform-badge">
                    {label}
                  </span>
                );
              })}
            </span>
          )}
          {result.overview && <span className="search-result-overview">{result.overview}</span>}
        </span>
      </div>
      <button
        type="button"
        className="recommend-item-action recommend-item-action-stack"
        onClick={() => onAddToStacked(result)}
      >
        ストックに追加
      </button>
    </li>
  );
}

type Props = {
  items: BacklogItem[];
  onClose: () => void;
  onAddTmdbWorkToStacked: (result: TmdbSearchResult) => Promise<void>;
};

export function RecommendModal({ items, onClose, onAddTmdbWorkToStacked }: Props) {
  const [recommendations, setRecommendations] = useState<TmdbSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const itemTmdbKeys = new Set(
      items
        .filter((item) => item.works?.tmdb_id && item.works?.tmdb_media_type)
        .map((item) => `${item.works!.tmdb_media_type}-${item.works!.tmdb_id}`),
    );

    const sourceItems = items
      .filter(
        (item) =>
          (item.status === "watched" || item.status === "watching") &&
          item.works?.tmdb_id != null &&
          item.works?.source_type === "tmdb" &&
          item.works?.work_type !== "season",
      )
      .sort((a, b) => {
        if (a.status === "watched" && b.status !== "watched") return -1;
        if (a.status !== "watched" && b.status === "watched") return 1;
        return Math.random() - 0.5;
      })
      .slice(0, 5)
      .map((item) => ({
        tmdbId: item.works!.tmdb_id!,
        tmdbMediaType: item.works!.tmdb_media_type as "movie" | "tv",
      }));

    setIsLoading(true);
    fetchMergedRecommendations(sourceItems)
      .then((results) => {
        const filtered = results
          .filter(
            (r) =>
              !itemTmdbKeys.has(`${r.tmdbMediaType}-${r.tmdbId}`) &&
              (r.workType === "series" || r.hasJapaneseRelease),
          )
          .slice(0, 30);
        setRecommendations(filtered);
      })
      .catch(() => {
        /* non-critical */
      })
      .finally(() => setIsLoading(false));
  }, []);

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
          <div className="recommend-results">
            {isLoading ? (
              <p className="recommend-empty">おすすめを読み込み中...</p>
            ) : recommendations.length === 0 ? (
              <p className="recommend-empty">おすすめが見つかりませんでした</p>
            ) : (
              <ul className="recommend-item-list" role="list">
                {recommendations.map((result) => {
                  const key = `${result.tmdbMediaType}-${result.tmdbId}`;
                  const removeItem = () =>
                    setRecommendations((prev) =>
                      prev.filter((r) => `${r.tmdbMediaType}-${r.tmdbId}` !== key),
                    );
                  return (
                    <RecommendItem
                      key={key}
                      result={result}
                      onAddToStacked={async (r) => {
                        await onAddTmdbWorkToStacked(r);
                        removeItem();
                      }}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
