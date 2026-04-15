import { useEffect, useRef } from "react";
import type { BacklogStatus } from "../types.ts";
import { statusLabels, statusOrder } from "../constants.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";
import type { KanbanColumnProps } from "./kanban-board-shared.ts";

const SWIPE_THRESHOLD_PX = 50;

type Props = Readonly<{
  selectedTabStatus: BacklogStatus;
  isMobileDragging: boolean;
  onTabChange: (status: BacklogStatus) => void;
  getColumnProps: (status: BacklogStatus) => KanbanColumnProps;
  columnRef: (status: BacklogStatus, el: HTMLElement | null) => void;
}>;

export function MobileKanbanBoard({
  selectedTabStatus,
  isMobileDragging,
  onTabChange,
  getColumnProps,
  columnRef,
}: Props) {
  const tabButtonRefs = useRef<Partial<Record<BacklogStatus, HTMLButtonElement | null>>>({});
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const currentIndex = statusOrder.indexOf(selectedTabStatus);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const activeTab = tabButtonRefs.current[selectedTabStatus];
    if (typeof activeTab?.scrollIntoView === "function") {
      activeTab.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedTabStatus]);

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

  return (
    <section className="mt-3 flex w-full min-w-0 flex-col gap-0 overflow-hidden max-w-full max-[500px]:mt-2 max-[400px]:mt-1.5">
      <div
        className="hide-scrollbar flex w-full min-w-0 max-w-full gap-[6px] overflow-x-auto pb-[10px] max-[500px]:gap-1 max-[500px]:pb-2 max-[400px]:gap-0.5 max-[400px]:pb-1.5"
        role="tablist"
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
      </div>
      <div
        ref={tabContentRef}
        className="board-tab-content flex-1 w-full min-w-0 overflow-y-auto"
        onScroll={handleTabContentScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <KanbanColumn
          key={selectedTabStatus}
          {...getColumnProps(selectedTabStatus)}
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
