import { useCallback, useMemo } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { BacklogItem, BacklogStatus, ViewingMode } from "../types.ts";
import { statusOrder, viewingModeOrder } from "../constants.ts";
import { sortStackedItemsByViewingMode } from "../viewing-mode.ts";
import { DesktopKanbanBoard } from "./DesktopKanbanBoard.tsx";
import { MobileKanbanBoard } from "./MobileKanbanBoard.tsx";

type Props = {
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
};

export function KanbanBoard({
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
    void setActiveViewingMode((current) => (current === mode ? null : mode));
  }, []);

  const grouped = useMemo(() => {
    const nextGrouped = new Map<BacklogStatus, BacklogItem[]>(
      statusOrder.map((status) => [status, []]),
    );

    for (const item of items) {
      nextGrouped.get(item.status)?.push(item);
    }

    // ドラッグ中は視聴モードによる再ソートをスキップ（localItems の順序を保持）
    if (!isDragging) {
      nextGrouped.set(
        "stacked",
        sortStackedItemsByViewingMode(nextGrouped.get("stacked") ?? [], activeViewingMode),
      );
    }

    return nextGrouped;
  }, [items, activeViewingMode, isDragging]);

  const columnPropsByStatus = useMemo(
    () =>
      new Map(
        statusOrder.map((status) => [
          status,
          {
            status,
            items: grouped.get(status) ?? [],
            activeViewingMode: status === "stacked" ? activeViewingMode : null,
            isMobileLayout,
            onOpenAddModal,
            onOpenDetail,
            onDeleteItem,
            onMarkAsWatched,
            onViewingModeToggle: status === "stacked" ? handleViewingModeToggle : undefined,
          },
        ]),
      ),
    [
      activeViewingMode,
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
