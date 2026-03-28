import { useState } from "react";
import type { BacklogItem, WorkSummary } from "../types.ts";

type ViewingMode = "focus" | "thoughtful" | "quick";

const MODES: { id: ViewingMode; label: string; icon: string }[] = [
  { id: "focus", label: "ガッツリ", icon: "🎬" },
  { id: "thoughtful", label: "じっくり", icon: "🤔" },
  { id: "quick", label: "サクッと", icon: "⚡" },
];

function filterItems(items: BacklogItem[], mode: ViewingMode): BacklogItem[] {
  return items
    .filter((item) => {
      const work = item.works;
      if (!work || work.source_type === "manual") return false;

      const { focus_required_score, background_fit_score, completion_load_score } = work;

      if (mode === "focus" && (focus_required_score === null || focus_required_score < 75))
        return false;
      if (mode === "thoughtful" && (background_fit_score === null || background_fit_score < 50))
        return false;
      if (mode === "quick" && (completion_load_score === null || completion_load_score >= 25))
        return false;

      return true;
    })
    .slice(0, 3);
}

function RecommendItem({ item, onMove }: { item: BacklogItem; onMove: (itemId: string) => void }) {
  const [posterError, setPosterError] = useState(false);
  const work = item.works as WorkSummary;
  const title = item.display_title ?? work.title;
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w92${work.poster_path}` : null;

  return (
    <li className="recommend-item">
      <div className="recommend-item-info">
        <div className="recommend-item-thumb">
          {posterUrl && !posterError ? (
            <img src={posterUrl} alt={title} onError={() => setPosterError(true)} />
          ) : (
            <span className="recommend-item-thumb-fallback">{title.slice(0, 2)}</span>
          )}
        </div>
        <span className="recommend-item-title">{title}</span>
      </div>
      <button
        type="button"
        className="recommend-item-move"
        onClick={() => onMove(item.id)}
        title="見たい列に追加"
      >
        見る
      </button>
    </li>
  );
}

type Props = {
  items: BacklogItem[];
  onClose: () => void;
  onMoveToWantToWatch: (itemId: string) => void;
};

export function RecommendModal({ items, onClose, onMoveToWantToWatch }: Props) {
  const [activeMode, setActiveMode] = useState<ViewingMode>("thoughtful");

  const stackedItems = items.filter((item) => item.status === "stacked");
  const suggestions = activeMode ? filterItems(stackedItems, activeMode) : [];

  const handleModeClick = (mode: ViewingMode) => {
    setActiveMode((prev) => (prev === mode ? null : mode));
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
                  onClick={() => handleModeClick(mode.id)}
                >
                  <span className="recommend-mode-icon" aria-hidden="true">
                    {mode.icon}
                  </span>
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
                  <RecommendItem key={item.id} item={item} onMove={onMoveToWantToWatch} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
