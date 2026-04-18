import { type ReactNode, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { KanbanColumnProps } from "./kanban-board-shared.ts";
import { BacklogCard } from "./BacklogCard.tsx";
import { KanbanColumnHeader } from "./KanbanColumnHeader.tsx";
import { ViewingModeFilter } from "./ViewingModeFilter.tsx";

const RECENT_WATCHED_COUNT = 20;

type Props = KanbanColumnProps & {
  extra?: ReactNode;
};

export function KanbanColumn({
  boardMode,
  status,
  items,
  extra,
  activeViewingMode,
  isMobileLayout,
  onOpenAddModal,
  onOpenDetail,
  onDeleteItem,
  onMarkAsWatched,
  onViewingModeToggle,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  const [isOlderOpen, setIsOlderOpen] = useState(false);

  const isEmptyColumnActive = isOver && items.length === 0;

  const dropzoneStyle: React.CSSProperties | undefined = isEmptyColumnActive
    ? {
        minHeight: "120px",
        borderRadius: "20px",
        outline: "2px dashed rgba(191, 90, 54, 0.45)",
        outlineOffset: "6px",
      }
    : undefined;

  const itemIds = items.map((item) => item.id);

  const isWatchedWithOverflow = status === "watched" && items.length > RECENT_WATCHED_COUNT;
  const recentItems = isWatchedWithOverflow ? items.slice(0, RECENT_WATCHED_COUNT) : items;
  const olderItems = isWatchedWithOverflow ? items.slice(RECENT_WATCHED_COUNT) : [];

  return (
    <section
      className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-[24px] border border-[var(--border)] bg-[var(--surface)] py-[14px] shadow-[var(--shadow)] backdrop-blur-[20px] max-[500px]:rounded-[18px] max-[500px]:py-3 max-[400px]:rounded-[14px] max-[400px]:py-2"
      data-column-status={status}
    >
      {extra}
      <KanbanColumnHeader
        boardMode={boardMode}
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
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {items.length > 0 ? (
              <>
                {recentItems.map((item) => (
                  <BacklogCard
                    key={item.id}
                    item={item}
                    showModeBadge={boardMode === "video" && status === "stacked"}
                    onOpenDetail={() => onOpenDetail(item.id)}
                    onDeleteItem={onDeleteItem}
                    onMarkAsWatched={onMarkAsWatched}
                  />
                ))}
                {isWatchedWithOverflow && (
                  <>
                    {!isOlderOpen && (
                      <button
                        type="button"
                        className="flex items-center gap-[6px] rounded-full border border-[var(--border)] bg-[rgba(92,59,35,0.04)] px-[12px] py-[7px] text-[0.8rem] text-[var(--text-muted)] hover:bg-[rgba(92,59,35,0.08)] transition-colors"
                        onClick={() => setIsOlderOpen(true)}
                      >
                        <svg
                          className="h-[12px] w-[12px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]"
                          viewBox="0 0 12 12"
                          aria-hidden="true"
                        >
                          <path d="M2 4l4 4 4-4" />
                        </svg>
                        {`過去の視聴済み（${olderItems.length}件）`}
                      </button>
                    )}
                    {isOlderOpen &&
                      olderItems.map((item) => (
                        <BacklogCard
                          key={item.id}
                          item={item}
                          showModeBadge={false}
                          onOpenDetail={() => onOpenDetail(item.id)}
                          onDeleteItem={onDeleteItem}
                          onMarkAsWatched={onMarkAsWatched}
                        />
                      ))}
                  </>
                )}
              </>
            ) : (
              <p className="text-[var(--text-muted)] pt-[18px] text-[0.92rem]">
                この列にはまだカードがありません。
              </p>
            )}
          </SortableContext>
        </div>
      </div>
    </section>
  );
}
