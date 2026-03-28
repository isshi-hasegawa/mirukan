import { useEffect, useRef } from "react";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { statusOrder, statusLabels } from "../constants.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";

const SWIPE_THRESHOLD_PX = 50;

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
  items: BacklogItem[];
  dropIndicator: DropIndicator | null;
  openMenuId: string | null;
  isMobileLayout: boolean;
  isMobileDragging: boolean;
  selectedTabStatus: BacklogStatus;
  onTabChange: (status: BacklogStatus) => void;
  onOpenAddModal: (status: BacklogStatus) => void;
  onOpenDetail: (itemId: string) => void;
  onToggleMenu: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
  onDragStart: (itemId: string, status: BacklogStatus) => void;
  onDragEnd: () => void;
  onDragOver: (itemId: string, clientY: number) => void;
  onDrop: (
    targetStatus: BacklogStatus,
    targetItemId: string | null,
    side: "before" | "after",
  ) => void;
  onDropIndicatorChange: (indicator: DropIndicator | null) => void;
  columnRef: (status: BacklogStatus, el: HTMLElement | null) => void;
};

export function KanbanBoard({
  items,
  dropIndicator,
  openMenuId,
  isMobileLayout,
  isMobileDragging,
  selectedTabStatus,
  onTabChange,
  onOpenAddModal,
  onOpenDetail,
  onToggleMenu,
  onDeleteItem,
  onMarkAsWatched,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDropIndicatorChange,
  columnRef,
}: Props) {
  const grouped = new Map<BacklogStatus, BacklogItem[]>(statusOrder.map((status) => [status, []]));

  for (const item of items) {
    grouped.get(item.status)?.push(item);
  }

  const tabsRef = useRef<HTMLElement>(null);
  const tabButtonRefs = useRef<Partial<Record<BacklogStatus, HTMLButtonElement | null>>>({});
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentIndex = statusOrder.indexOf(selectedTabStatus);

  useEffect(() => {
    if (isMobileLayout && tabButtonRefs.current[selectedTabStatus]) {
      tabButtonRefs.current[selectedTabStatus]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedTabStatus, isMobileLayout]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isMobileDragging) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0 && currentIndex < statusOrder.length - 1) {
      onTabChange(statusOrder[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      onTabChange(statusOrder[currentIndex - 1]);
    }
  };

  const columnProps = (status: BacklogStatus) => ({
    status,
    items: grouped.get(status) ?? [],
    dropIndicator,
    openMenuId,
    onOpenAddModal,
    onOpenDetail,
    onToggleMenu,
    onDeleteItem,
    onMarkAsWatched,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onDropIndicatorChange,
  });

  if (isMobileLayout) {
    return (
      <section className="board board-mobile">
        <nav className="board-tabs" role="tablist" ref={tabsRef}>
          {statusOrder.map((status) => (
            <button
              key={status}
              ref={(el) => {
                tabButtonRefs.current[status] = el as HTMLButtonElement | null;
              }}
              type="button"
              role="tab"
              aria-selected={selectedTabStatus === status}
              className={`board-tab${selectedTabStatus === status ? " is-active" : ""}`}
              onClick={() => onTabChange(status)}
            >
              {statusLabels[status]}
              <span className="board-tab-badge">{grouped.get(status)?.length ?? 0}</span>
            </button>
          ))}
        </nav>
        <div
          className="board-tab-content"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <KanbanColumn
            key={selectedTabStatus}
            {...columnProps(selectedTabStatus)}
            extra={
              <div
                ref={(el) => columnRef(selectedTabStatus, el as HTMLElement | null)}
                style={{ position: "absolute" }}
              />
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section className="board">
      {statusOrder.map((status) => (
        <KanbanColumn
          key={status}
          {...columnProps(status)}
          extra={
            <div
              ref={(el) => columnRef(status, el as HTMLElement | null)}
              style={{ position: "absolute" }}
            />
          }
        />
      ))}
    </section>
  );
}
