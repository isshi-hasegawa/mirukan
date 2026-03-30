import { useEffect, useRef, useState } from "react";
import type { BacklogItem, BacklogStatus, ViewingMode } from "../types.ts";
import { statusOrder, statusLabels } from "../constants.ts";
import { sortStackedItemsByViewingMode } from "../data.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";

const SWIPE_THRESHOLD_PX = 50;

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
  items: BacklogItem[];
  dropIndicator: DropIndicator | null;
  isMobileLayout: boolean;
  isMobileDragging: boolean;
  selectedTabStatus: BacklogStatus;
  onTabChange: (status: BacklogStatus) => void;
  onOpenAddModal: () => void;
  onOpenDetail: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
  columnRef: (status: BacklogStatus, el: HTMLElement | null) => void;
};

export function KanbanBoard({
  items,
  dropIndicator,
  isMobileLayout,
  isMobileDragging,
  selectedTabStatus,
  onTabChange,
  onOpenAddModal,
  onOpenDetail,
  onDeleteItem,
  onMarkAsWatched,
  columnRef,
}: Props) {
  const [activeViewingMode, setActiveViewingMode] = useState<ViewingMode | null>(null);
  const grouped = new Map<BacklogStatus, BacklogItem[]>(statusOrder.map((status) => [status, []]));

  for (const item of items) {
    grouped.get(item.status)?.push(item);
  }

  grouped.set(
    "stacked",
    sortStackedItemsByViewingMode(grouped.get("stacked") ?? [], activeViewingMode),
  );

  const tabsRef = useRef<HTMLElement>(null);
  const tabButtonRefs = useRef<Partial<Record<BacklogStatus, HTMLButtonElement | null>>>({});
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const currentIndex = statusOrder.indexOf(selectedTabStatus);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isMobileLayout && tabButtonRefs.current[selectedTabStatus]) {
      tabButtonRefs.current[selectedTabStatus]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedTabStatus, isMobileLayout]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const handleTabContentScroll = () => {
    const el = tabContentRef.current;
    if (!el) return;
    el.classList.add("is-scrolling");
    if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      el.classList.remove("is-scrolling");
      scrollTimerRef.current = null;
    }, 1000);
  };

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
    activeViewingMode: status === "stacked" ? activeViewingMode : null,
    isMobileLayout,
    dropIndicator,
    onOpenAddModal,
    onOpenDetail,
    onDeleteItem,
    onMarkAsWatched,
    onViewingModeToggle:
      status === "stacked"
        ? (mode: ViewingMode) => {
            setActiveViewingMode((current) => (current === mode ? null : mode));
          }
        : undefined,
  });

  if (isMobileLayout) {
    return (
      <section className="mt-3 flex w-full min-w-0 flex-col gap-0 overflow-hidden max-w-full max-[500px]:mt-2 max-[400px]:mt-1.5">
        <nav
          className="hide-scrollbar flex w-full min-w-0 max-w-full gap-[6px] overflow-x-auto pb-[10px] max-[500px]:gap-1 max-[500px]:pb-2 max-[400px]:gap-0.5 max-[400px]:pb-1.5"
          role="tablist"
          ref={tabsRef}
        >
          {statusOrder.map((status) => {
            const isActive = selectedTabStatus === status;
            return (
              <button
                key={status}
                ref={(el) => {
                  tabButtonRefs.current[status] = el as HTMLButtonElement | null;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={[
                  "inline-flex items-center gap-[6px] px-[14px] py-2 border rounded-full text-[0.875rem] font-medium cursor-pointer whitespace-nowrap shrink-0 transition-[background,color,border-color] duration-[150ms] max-[500px]:px-3 max-[500px]:py-1.5 max-[500px]:text-[0.8rem] max-[500px]:gap-1.5 max-[400px]:px-2 max-[400px]:py-1 max-[400px]:text-[0.75rem] max-[400px]:gap-1",
                  isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]",
                ].join(" ")}
                onClick={() => onTabChange(status)}
              >
                {statusLabels[status]}
              </button>
            );
          })}
        </nav>
        <div
          ref={tabContentRef}
          className="board-tab-content flex-1 w-full min-w-0 overflow-y-auto"
          onScroll={handleTabContentScroll}
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
    <section className="mt-3 grid min-w-0 max-w-full min-h-0 grid-cols-[minmax(280px,1.35fr)_repeat(4,minmax(220px,1fr))] items-stretch gap-2 overflow-x-auto pb-[6px]">
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
