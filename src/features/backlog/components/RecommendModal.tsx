import { useEffect, useState } from "react";
import { fetchMergedRecommendations } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import type { BacklogItem } from "../types.ts";
import { TmdbWorkCard } from "./TmdbWorkCard.tsx";

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
                    <li key={key} className="recommend-item">
                      <TmdbWorkCard
                        result={result}
                        onAddToStacked={async () => {
                          await onAddTmdbWorkToStacked(result);
                          removeItem();
                        }}
                      />
                    </li>
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
