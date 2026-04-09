import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BacklogStatus } from "../types.ts";
import type { KanbanColumnProps } from "./kanban-board-shared.ts";
import type { DropIndicator } from "./kanban-board-shared.ts";
import { BacklogCard } from "./BacklogCard.tsx";
import { KanbanColumnHeader } from "./KanbanColumnHeader.tsx";
import { ViewingModeFilter } from "./ViewingModeFilter.tsx";

function TopSlot({ status }: { status: BacklogStatus }) {
  const { setNodeRef } = useDroppable({ id: `top-slot:${status}` });
  return <div ref={setNodeRef} className="h-6" />;
}

function BottomSlot({ status }: { status: BacklogStatus }) {
  const { setNodeRef } = useDroppable({ id: `bottom-slot:${status}` });
  return <div ref={setNodeRef} className="h-6" />;
}

type Props = KanbanColumnProps & {
  extra?: ReactNode;
};

export function KanbanColumn({
  status,
  items,
  extra,
  activeViewingMode = null,
  isMobileLayout = false,
  dropIndicator,
  onOpenAddModal,
  onOpenDetail,
  onDeleteItem,
  onMarkAsWatched,
  onViewingModeToggle,
}: Props) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });
  const isColumnActive =
    dropIndicator?.type === "column" && dropIndicator.status === status && items.length === 0;

  const dropzoneStyle: React.CSSProperties | undefined = isColumnActive
    ? {
        minHeight: "120px",
        borderRadius: "20px",
        outline: "2px dashed rgba(191, 90, 54, 0.45)",
        outlineOffset: "6px",
      }
    : undefined;

  const firstItemId = items[0]?.id;
  const lastItemId = items.at(-1)?.id;
  const effectiveDropIndicator: DropIndicator | null =
    dropIndicator?.type === "top-slot" && dropIndicator.status === status && firstItemId
      ? { type: "card", itemId: firstItemId, side: "before" }
      : dropIndicator?.type === "bottom-slot" && dropIndicator.status === status && lastItemId
        ? { type: "card", itemId: lastItemId, side: "after" }
        : dropIndicator;

  return (
    <section
      className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-[24px] border border-[var(--border)] bg-[var(--surface)] py-[14px] shadow-[var(--shadow)] backdrop-blur-[20px] max-[500px]:rounded-[18px] max-[500px]:py-3 max-[400px]:rounded-[14px] max-[400px]:py-2"
      data-column-status={status}
    >
      {extra}
      <KanbanColumnHeader
        status={status}
        itemCount={items.length}
        isMobileLayout={isMobileLayout}
        onOpenAddModal={onOpenAddModal}
      />
      <div
        ref={setNodeRef}
        className="grid min-h-0 min-w-0 flex-1 content-start gap-[10px] overflow-y-auto pt-[10px] [scrollbar-gutter:stable]"
        style={dropzoneStyle}
        data-dropzone-status={status}
      >
        <div className="grid content-start gap-[10px] pl-[14px] pr-[4px] max-[500px]:px-3 max-[400px]:px-2">
          {status === "stacked" && onViewingModeToggle ? (
            <ViewingModeFilter
              activeViewingMode={activeViewingMode}
              onViewingModeToggle={onViewingModeToggle}
            />
          ) : null}
          <TopSlot status={status} />
          {items.length > 0 ? (
            <>
              {items.map((item) => (
                <BacklogCard
                  key={item.id}
                  item={item}
                  showModeBadge={status === "stacked"}
                  dropIndicator={effectiveDropIndicator}
                  onOpenDetail={() => onOpenDetail(item.id)}
                  onDeleteItem={onDeleteItem}
                  onMarkAsWatched={onMarkAsWatched}
                />
              ))}
              <BottomSlot status={status} />
            </>
          ) : (
            <p className="text-[var(--text-muted)] pt-[18px] text-[0.92rem]">
              この列にはまだカードがありません。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
