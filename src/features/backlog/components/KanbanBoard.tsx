import { useCallback, useMemo, useRef } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { BacklogItem, BacklogStatus, BoardMode, ViewingMode } from "../types.ts";
import { statusOrder, viewingModeOrder } from "../constants.ts";
import { sortStackedItemsByViewingMode } from "../viewing-mode.ts";
import { DesktopKanbanBoard } from "./DesktopKanbanBoard.tsx";
import { MobileKanbanBoard } from "./MobileKanbanBoard.tsx";

type Props = Readonly<{
  boardMode: BoardMode;
  items: BacklogItem[];
  isDragging: boolean;
  isMobileLayout: boolean;
  isMobileDragging: boolean;
  selectedTabStatus: BacklogStatus;
  onTabChange: (status: BacklogStatus) => void;
  onOpenAddModal: () => void;
  onOpenDetail: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
  columnRef: (status: BacklogStatus, el: HTMLElement | null) => void;
}>;

export function KanbanBoard({
  boardMode,
  items,
  isDragging,
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
  const [activeViewingMode, setActiveViewingMode] = useQueryState(
    "view",
    parseAsStringLiteral(viewingModeOrder).withOptions({
      history: "replace",
    }),
  );
  const handleViewingModeToggle = useCallback((mode: ViewingMode) => {
    setActiveViewingMode((current) => (current === mode ? null : mode));
  }, []);
  const allowsViewingModeFilter = boardMode === "video";
  const lastStableItemsRef = useRef<BacklogItem[] | null>(null);
  const lastStableStackedItemsRef = useRef<BacklogItem[] | null>(null);

  const grouped = useMemo(() => {
    const nextGrouped = new Map<BacklogStatus, BacklogItem[]>(
      statusOrder.map((status) => [status, []]),
    );

    for (const item of items) {
      nextGrouped.get(item.status)?.push(item);
    }

    const sortedStackedItems = sortStackedItemsByViewingMode(
      nextGrouped.get("stacked") ?? [],
      allowsViewingModeFilter ? activeViewingMode : null,
    );

    if (!isDragging) {
      lastStableItemsRef.current = items;
      lastStableStackedItemsRef.current = sortedStackedItems;
      nextGrouped.set("stacked", sortedStackedItems);
    } else if (lastStableItemsRef.current === items && lastStableStackedItemsRef.current) {
      // ドラッグ開始直後は、直前の filtered 表示順を維持してカードが跳ねないようにする
      nextGrouped.set("stacked", lastStableStackedItemsRef.current);
    }

    return nextGrouped;
  }, [items, activeViewingMode, allowsViewingModeFilter, isDragging]);

  const columnPropsByStatus = useMemo(
    () =>
      new Map(
        statusOrder.map((status) => [
          status,
          {
            boardMode,
            status,
            items: grouped.get(status) ?? [],
            activeViewingMode:
              allowsViewingModeFilter && status === "stacked" ? activeViewingMode : null,
            isMobileLayout,
            onOpenAddModal,
            onOpenDetail,
            onDeleteItem,
            onMarkAsWatched,
            onViewingModeToggle:
              allowsViewingModeFilter && status === "stacked" ? handleViewingModeToggle : undefined,
          },
        ]),
      ),
    [
      activeViewingMode,
      allowsViewingModeFilter,
      boardMode,
      grouped,
      handleViewingModeToggle,
      isMobileLayout,
      onDeleteItem,
      onMarkAsWatched,
      onOpenAddModal,
      onOpenDetail,
    ],
  );

  const getColumnProps = useCallback(
    (status: BacklogStatus) => columnPropsByStatus.get(status)!,
    [columnPropsByStatus],
  );

  if (isMobileLayout) {
    return (
      <MobileKanbanBoard
        selectedTabStatus={selectedTabStatus}
        isMobileDragging={isMobileDragging}
        onTabChange={onTabChange}
        getColumnProps={getColumnProps}
        columnRef={columnRef}
      />
    );
  }

  return <DesktopKanbanBoard getColumnProps={getColumnProps} columnRef={columnRef} />;
}
