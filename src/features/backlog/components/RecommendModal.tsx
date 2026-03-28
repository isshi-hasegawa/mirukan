import { useState } from "react";
import type { BacklogItem, WorkSummary } from "../types.ts";

type ViewingMode = "focus" | "thoughtful" | "quick";
type WorkTypeFilter = "movie" | "series_season" | null;

const MODES: { id: ViewingMode; label: string; icon: string }[] = [
  { id: "focus", label: "ガッツリ", icon: "🎬" },
  { id: "thoughtful", label: "じっくり", icon: "🤔" },
  { id: "quick", label: "サクッと", icon: "⚡" },
];

const WORK_TYPE_FILTERS: { id: NonNullable<WorkTypeFilter>; label: string }[] = [
  { id: "movie", label: "映画" },
  { id: "series_season", label: "シリーズ" },
];

function filterItems(
  items: BacklogItem[],
  mode: ViewingMode,
  workTypeFilter: WorkTypeFilter,
): BacklogItem[] {
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

      if (workTypeFilter === "movie" && work.work_type !== "movie") return false;
      if (workTypeFilter === "series_season" && work.work_type === "movie") return false;

      return true;
    })
    .slice(0, 3);
}

function RecommendItem({
  item,
  onOpenDetail,
  onMove,
}: {
  item: BacklogItem;
  onOpenDetail: (itemId: string) => void;
  onMove: (itemId: string) => void;
}) {
  const [posterError, setPosterError] = useState(false);
  const work = item.works as WorkSummary;
  const title = item.display_title ?? work.title;
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w92${work.poster_path}` : null;

  return (
    <li className="recommend-item">
      <button type="button" className="recommend-item-info" onClick={() => onOpenDetail(item.id)}>
        <div className="recommend-item-thumb">
          {posterUrl && !posterError ? (
            <img src={posterUrl} alt={title} onError={() => setPosterError(true)} />
          ) : (
            <span className="recommend-item-thumb-fallback">{title.slice(0, 2)}</span>
          )}
        </div>
        <span className="recommend-item-title">{title}</span>
      </button>
      <button
        type="button"
        className="recommend-item-move"
        onClick={() => onMove(item.id)}
        title="見たい列のトップへ移動"
      >
        見たいへ
      </button>
    </li>
  );
}

type Props = {
  items: BacklogItem[];
  onClose: () => void;
  onOpenDetail: (itemId: string) => void;
  onMoveToWantToWatch: (itemId: string) => void;
};

export function RecommendModal({ items, onClose, onOpenDetail, onMoveToWantToWatch }: Props) {
  const [activeMode, setActiveMode] = useState<ViewingMode | null>(null);
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeFilter>(null);

  const stackedItems = items.filter((item) => item.status === "stacked");
  const suggestions = activeMode ? filterItems(stackedItems, activeMode, workTypeFilter) : [];

  const handleModeClick = (mode: ViewingMode) => {
    setActiveMode((prev) => (prev === mode ? null : mode));
  };

  const handleWorkTypeClick = (wt: NonNullable<WorkTypeFilter>) => {
    setWorkTypeFilter((prev) => (prev === wt ? null : wt));
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
        <header className="modal-header">
          <h2 className="modal-title">次何見る？</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="閉じる">
            <svg viewBox="0 0 20 20" aria-hidden="true" width="20" height="20">
              <path
                d="M4 4l12 12M16 4L4 16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </header>

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

            <div className="recommend-work-type-filter">
              {WORK_TYPE_FILTERS.map((wt) => (
                <button
                  key={wt.id}
                  type="button"
                  className={`recommend-work-type-button${workTypeFilter === wt.id ? " is-active" : ""}`}
                  onClick={() => handleWorkTypeClick(wt.id)}
                >
                  {wt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="recommend-results">
            {activeMode === null ? (
              <p className="recommend-guide">気分を選ぶとレコメンドします</p>
            ) : suggestions.length === 0 ? (
              <p className="recommend-empty">積みの中に該当する作品がありません</p>
            ) : (
              <ul className="recommend-item-list" role="list">
                {suggestions.map((item) => (
                  <RecommendItem
                    key={item.id}
                    item={item}
                    onOpenDetail={onOpenDetail}
                    onMove={onMoveToWantToWatch}
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
