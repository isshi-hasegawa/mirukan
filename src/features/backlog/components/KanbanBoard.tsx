import { useMemo, useEffect, useRef } from "react";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { statusOrder, statusLabels } from "../constants.ts";
import { getViewingMode, type ViewingMode } from "../data.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";

const SWIPE_THRESHOLD_PX = 50;
const ITEMS_PER_MODE = 3;
const MODE_ORDER: ViewingMode[] = ["focus", "thoughtful", "quick", "background"];
const CACHE_KEY = "stacked-mode-selection";
const CACHE_TTL = 24 * 60 * 60 * 1000;

type ModeSelection = {
  timestamp: number;
  itemIds: Record<ViewingMode, string[]>;
};

function getOrCreateModeSelection(stackedItems: BacklogItem[]): Record<ViewingMode, string[]> {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ModeSelection;
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.itemIds;
      }
    }
  } catch {
    // ignore
  }

  const itemIds = Object.fromEntries(
    MODE_ORDER.map((mode) => {
      const modeItems = stackedItems.filter((i) => i.works && getViewingMode(i.works) === mode);
      const shuffled = [...modeItems].sort(() => Math.random() - 0.5);
      return [mode, shuffled.slice(0, ITEMS_PER_MODE).map((i) => i.id)];
    }),
  ) as Record<ViewingMode, string[]>;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), itemIds }));
  } catch {
    // ignore
  }

  return itemIds;
}

function sortStackedItems(items: BacklogItem[]): {
  sorted: BacklogItem[];
  featuredIds: Set<string>;
} {
  const selection = getOrCreateModeSelection(items);
  const featuredIds = new Set(Object.values(selection).flat());

  const featured: BacklogItem[] = [];
  for (const mode of MODE_ORDER) {
    for (const id of selection[mode]) {
      const item = items.find((i) => i.id === id);
      if (item) featured.push(item);
    }
  }

  const rest = items.filter((i) => !featuredIds.has(i.id));
  return { sorted: [...featured, ...rest], featuredIds };
}

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
  onOpenAddModal: (status: BacklogStatus) => void;
  onOpenDetail: (itemId: string) => void;
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
  isMobileLayout,
  isMobileDragging,
  selectedTabStatus,
  onTabChange,
  onOpenAddModal,
  onOpenDetail,
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

  const { sorted: stackedSorted, featuredIds: stackedFeaturedIds } = useMemo(
    () => sortStackedItems(grouped.get("stacked") ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );
  grouped.set("stacked", stackedSorted);

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
    featuredIds: status === "stacked" ? stackedFeaturedIds : undefined,
    dropIndicator,
    onOpenAddModal,
    onOpenDetail,
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
      <section className="flex flex-col gap-0 mt-3">
        <nav
          className="flex overflow-x-auto [scrollbar-width:none] gap-[6px] pb-[10px] [&::-webkit-scrollbar]:hidden"
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
                  "inline-flex items-center gap-[6px] px-[14px] py-2 border rounded-full text-[0.875rem] font-medium cursor-pointer whitespace-nowrap shrink-0 transition-[background,color,border-color] duration-[150ms]",
                  isActive
                    ? "bg-primary text-white border-primary"
                    : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)]",
                ].join(" ")}
                onClick={() => onTabChange(status)}
              >
                {statusLabels[status]}
                <span
                  className={[
                    "inline-flex items-center justify-center min-w-[20px] px-[6px] py-[2px] rounded-full text-[0.75rem] font-bold",
                    isActive ? "bg-white/30 text-inherit" : "bg-primary/15 text-primary",
                  ].join(" ")}
                >
                  {grouped.get(status)?.length ?? 0}
                </span>
              </button>
            );
          })}
        </nav>
        <div
          ref={tabContentRef}
          className="board-tab-content flex-1 w-full overflow-y-auto"
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
    <section className="grid grid-cols-[repeat(5,minmax(240px,1fr))] gap-2 mt-3 overflow-x-auto pb-[6px] min-h-0 items-stretch">
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
