import { useEffect, useState } from "react";
import { fetchMergedRecommendations } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import type { BacklogItem } from "../types.ts";
import { TmdbWorkCard } from "./TmdbWorkCard.tsx";

type Props = {
  items: BacklogItem[];
  onClose: () => void;
  onAddTmdbWorksToStacked: (results: TmdbSearchResult[]) => Promise<void>;
};

export function RecommendModal({ items, onClose, onAddTmdbWorksToStacked }: Props) {
  const [recommendations, setRecommendations] = useState<TmdbSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

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

  const handleClose = async () => {
    const checked = recommendations.filter((r) =>
      checkedKeys.has(`${r.tmdbMediaType}-${r.tmdbId}`),
    );
    if (checked.length > 0) {
      await onAddTmdbWorksToStacked(checked);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center p-5 bg-[rgba(51,34,23,0.4)] backdrop-blur-[10px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) void handleClose();
      }}
    >
      <section
        className="w-[min(calc(100%-48px),700px)] max-h-[min(92svh,1100px)] border border-border rounded-[28px] bg-[#2a2a2a] shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6 flex flex-col overflow-hidden max-[720px]:p-5 max-[720px]:rounded-[22px]"
        role="dialog"
        aria-modal="true"
        aria-label="次何見る？"
      >
        <div className="flex flex-col gap-5 overflow-hidden">
          <h2 className="text-xl font-semibold text-foreground">
            あなたにおすすめの作品を追加しよう
          </h2>
          <div className="max-h-[80vh] overflow-y-auto">
            {isLoading ? (
              <p className="text-muted-foreground text-[0.9rem] p-0.5">おすすめを読み込み中...</p>
            ) : recommendations.length === 0 ? (
              <p className="text-muted-foreground text-[0.9rem] p-0.5">
                おすすめが見つかりませんでした
              </p>
            ) : (
              <ul className="flex flex-col gap-2 list-none p-0 m-0" role="list">
                {recommendations.map((result) => {
                  const key = `${result.tmdbMediaType}-${result.tmdbId}`;
                  const isChecked = checkedKeys.has(key);
                  return (
                    <li key={key} className="flex flex-col gap-2">
                      {!isChecked && (
                        <TmdbWorkCard
                          result={result}
                          onAddToStacked={() => {
                            setCheckedKeys((prev) => new Set(prev).add(key));
                          }}
                        />
                      )}
                      {isChecked && (
                        <button
                          type="button"
                          className="text-muted-foreground text-[0.85rem] hover:text-foreground transition-colors cursor-pointer text-center py-1"
                          onClick={() => {
                            setCheckedKeys((prev) => {
                              const next = new Set(prev);
                              next.delete(key);
                              return next;
                            });
                          }}
                        >
                          もとに戻す
                        </button>
                      )}
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
