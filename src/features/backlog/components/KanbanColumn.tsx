import type { BacklogItem, BacklogStatus } from "../types.ts";
import { statusLabels } from "../constants.ts";
import { BacklogCard } from "./BacklogCard.tsx";

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
  status: BacklogStatus;
  items: BacklogItem[];
  dropIndicator: DropIndicator | null;
  openMenuId: string | null;
  onOpenAddModal: (status: BacklogStatus) => void;
  onOpenDetail: (itemId: string) => void;
  onToggleMenu: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onDragStart: (itemId: string, status: BacklogStatus) => void;
  onDragEnd: () => void;
  onDragOver: (itemId: string, clientY: number) => void;
  onDrop: (
    targetStatus: BacklogStatus,
    targetItemId: string | null,
    side: "before" | "after",
  ) => void;
  onDropIndicatorChange: (indicator: DropIndicator | null) => void;
};

export function KanbanColumn({
  status,
  items,
  dropIndicator,
  openMenuId,
  onOpenAddModal,
  onOpenDetail,
  onToggleMenu,
  onDeleteItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDropIndicatorChange,
}: Props) {
  const isColumnActive = dropIndicator?.type === "column" && dropIndicator.status === status;

  const dropzoneClassName = ["card-list", isColumnActive ? "dropzone-active" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="board-column" data-column-status={status}>
      <header className="column-header">
        <div className="column-title-group">
          <h2>{statusLabels[status]}</h2>
          <span className="count-pill">{items.length}</span>
        </div>
        <button
          className="column-add-button"
          type="button"
          aria-label={`${statusLabels[status]} に追加`}
          title={`${statusLabels[status]} に追加`}
          onClick={() => onOpenAddModal(status)}
        >
          <svg className="plus-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 4.25v11.5M4.25 10h11.5" />
          </svg>
        </button>
      </header>
      <div
        className={dropzoneClassName}
        onDragOver={(e) => {
          if (!(e.target instanceof HTMLElement) || e.target.closest("[data-card-id]")) {
            return;
          }
          e.preventDefault();
          onDropIndicatorChange({ type: "column", status });
        }}
        onDragLeave={(e) => {
          const related = e.relatedTarget instanceof Node ? e.relatedTarget : null;
          if (related && e.currentTarget.contains(related)) {
            return;
          }
          if (dropIndicator?.type === "column" && dropIndicator.status === status) {
            onDropIndicatorChange(null);
          }
        }}
        onDrop={(e) => {
          if (e.target instanceof HTMLElement && e.target.closest("[data-card-id]")) {
            return;
          }
          e.preventDefault();
          onDrop(status, null, "after");
        }}
      >
        {items.length > 0 ? (
          items.map((item) => (
            <BacklogCard
              key={item.id}
              item={item}
              dropIndicator={dropIndicator}
              openMenuId={openMenuId}
              onOpenDetail={() => onOpenDetail(item.id)}
              onToggleMenu={onToggleMenu}
              onDeleteItem={onDeleteItem}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))
        ) : (
          <p className="empty-state">この列にはまだカードがありません。</p>
        )}
      </div>
    </section>
  );
}
