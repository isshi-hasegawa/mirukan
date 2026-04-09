import { useState } from "react";
import type { BacklogItem, BacklogStatus, ViewingMode } from "../types.ts";
import { statusOrder } from "../constants.ts";
import { sortStackedItemsByViewingMode } from "../viewing-mode.ts";
import { DesktopKanbanBoard } from "./DesktopKanbanBoard.tsx";
import { MobileKanbanBoard } from "./MobileKanbanBoard.tsx";
import type { DropIndicator } from "./kanban-board-shared.ts";

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

  const getColumnProps = (status: BacklogStatus) => ({
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
