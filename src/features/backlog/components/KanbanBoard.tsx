import type { BacklogItem, BacklogStatus } from "../types.ts";
import { statusOrder } from "../constants.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";
import { RecommendPanel } from "./RecommendPanel.tsx";

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
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

export function KanbanBoard({
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
  const grouped = new Map<BacklogStatus, BacklogItem[]>(statusOrder.map((status) => [status, []]));

  for (const item of items) {
    grouped.get(item.status)?.push(item);
  }

  return (
    <section className="board">
      {statusOrder.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          items={grouped.get(status) ?? []}
          extra={
            status === "want_to_watch" ? (
              <RecommendPanel items={items} onOpenDetail={onOpenDetail} />
            ) : undefined
          }
          dropIndicator={dropIndicator}
          openMenuId={openMenuId}
          onOpenAddModal={onOpenAddModal}
          onOpenDetail={onOpenDetail}
          onToggleMenu={onToggleMenu}
          onDeleteItem={onDeleteItem}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDropIndicatorChange={onDropIndicatorChange}
        />
      ))}
    </section>
  );
}
