import { useEffect, useState } from "react";
import type { BacklogItem, WorkSummary } from "../types.ts";

type ViewingMode = "focus" | "background" | "quick";

const MODES: { id: ViewingMode; label: string; description: string }[] = [
  { id: "focus", label: "がっつり", description: "集中して見たい" },
  { id: "background", label: "ながら見", description: "作業しながら" },
  { id: "quick", label: "サクッと", description: "短時間で終わる" },
];

function filterByMode(items: BacklogItem[], mode: ViewingMode): BacklogItem[] {
  return items.filter((item) => {
    const work = item.works;
    if (!work || work.source_type === "manual") return false;

    const { focus_required_score, background_fit_score, completion_load_score } = work;

    if (mode === "focus") {
      return focus_required_score !== null && focus_required_score >= 75;
    }
    if (mode === "background") {
      return background_fit_score !== null && background_fit_score >= 50;
    }
    if (mode === "quick") {
      return completion_load_score !== null && completion_load_score <= 25;
    }
    return false;
  });
}

function RecommendCard({
  item,
  onOpenDetail,
}: {
  item: BacklogItem;
  onOpenDetail: (itemId: string) => void;
}) {
  const [posterError, setPosterError] = useState(false);
  const work = item.works as WorkSummary;
  const title = item.display_title ?? work.title;
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w185${work.poster_path}` : null;

  useEffect(() => {
    setPosterError(false);
  }, [posterUrl]);

  return (
    <button type="button" className="recommend-card" onClick={() => onOpenDetail(item.id)}>
      <div className="recommend-card-thumb">
        {posterUrl && !posterError ? (
          <img src={posterUrl} alt={title} onError={() => setPosterError(true)} />
        ) : (
          <span className="recommend-card-thumb-fallback">{title}</span>
        )}
      </div>
      <p className="recommend-card-title">{title}</p>
    </button>
  );
}

type Props = {
  items: BacklogItem[];
  onOpenDetail: (itemId: string) => void;
};

export function RecommendPanel({ items, onOpenDetail }: Props) {
  const [activeMode, setActiveMode] = useState<ViewingMode | null>(null);

  const stackedItems = items.filter((item) => item.status === "stacked");
  const suggestions = activeMode ? filterByMode(stackedItems, activeMode) : [];

  const handleModeClick = (mode: ViewingMode) => {
    setActiveMode((prev) => (prev === mode ? null : mode));
  };

  return (
    <section className="recommend-bar">
      <div className="recommend-modes">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`recommend-mode-button${activeMode === mode.id ? " is-active" : ""}`}
            onClick={() => handleModeClick(mode.id)}
          >
            <span className="recommend-mode-label">{mode.label}</span>
            <span className="recommend-mode-desc">{mode.description}</span>
          </button>
        ))}
      </div>

      {activeMode !== null && (
        <div className="recommend-results">
          {suggestions.length === 0 ? (
            <p className="recommend-empty">積みの中に該当する作品がありません</p>
          ) : (
            <ul className="recommend-list" role="list">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <RecommendCard item={item} onOpenDetail={onOpenDetail} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
