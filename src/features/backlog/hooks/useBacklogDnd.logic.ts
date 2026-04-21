import type { BacklogItem, BacklogStatus } from "../types.ts";

export type RectLike = Pick<DOMRect, "top" | "height">;

type DragOverResolutionInput = Readonly<{
  items: BacklogItem[];
  activeId: string;
  overId: string;
  overRect: RectLike;
  pointerY: number;
  isMobileLayout: boolean;
}>;

type DropPersistenceInput = Readonly<{
  items: BacklogItem[];
  localItems: BacklogItem[];
  activeId: string;
}>;

type DropPersistence = Readonly<{
  activeId: string;
  status: BacklogStatus;
  sortOrder: number;
}>;

function findItemStatus(items: BacklogItem[], id: string): BacklogStatus | null {
  return items.find((item) => item.id === id)?.status ?? null;
}

function resolveDropSide(pointerY: number, overRect: RectLike): "before" | "after" {
  return pointerY < overRect.top + overRect.height / 2 ? "before" : "after";
}

function getReorderedColumnItems(
  columnItems: BacklogItem[],
  activeId: string,
  overId: string,
  side: "before" | "after",
) {
  const activeIdx = columnItems.findIndex((item) => item.id === activeId);
  const overIdx = columnItems.findIndex((item) => item.id === overId);
  if (activeIdx === -1 || overIdx === -1) {
    return columnItems;
  }

  const baseItems = columnItems.filter((item) => item.id !== activeId);
  const targetIdx = baseItems.findIndex((item) => item.id === overId);
  if (targetIdx === -1) {
    return columnItems;
  }

  const insertionIdx = side === "before" ? targetIdx : targetIdx + 1;
  const activeItem = columnItems[activeIdx];

  return [...baseItems.slice(0, insertionIdx), activeItem, ...baseItems.slice(insertionIdx)];
}

function moveItemToColumnEnd(items: BacklogItem[], activeId: string, status: BacklogStatus) {
  const activeItem = items.find((item) => item.id === activeId);
  if (!activeItem) {
    return items;
  }

  const updatedItems = items.map((item) => (item.id === activeId ? { ...item, status } : item));
  const columnItems = updatedItems.filter((item) => item.status === status && item.id !== activeId);
  const others = updatedItems.filter((item) => item.status !== status);

  return [...others, ...columnItems, { ...activeItem, status }];
}

function moveItemToColumnTop(items: BacklogItem[], activeId: string, status: BacklogStatus) {
  const activeItem = items.find((item) => item.id === activeId);
  if (!activeItem) {
    return items;
  }

  const updatedItems = items.map((item) => (item.id === activeId ? { ...item, status } : item));
  const columnItems = updatedItems.filter((item) => item.status === status && item.id !== activeId);
  const others = updatedItems.filter((item) => item.status !== status);

  return [...others, { ...activeItem, status }, ...columnItems];
}

function reorderWithinColumn(
  items: BacklogItem[],
  status: BacklogStatus,
  activeId: string,
  overId: string,
  side: "before" | "after",
) {
  const columnItems = items.filter((item) => item.status === status);
  const others = items.filter((item) => item.status !== status);
  return [...others, ...getReorderedColumnItems(columnItems, activeId, overId, side)];
}

function moveToColumnEdge(items: BacklogItem[], activeId: string, status: BacklogStatus) {
  return status === "watched"
    ? moveItemToColumnTop(items, activeId, status)
    : moveItemToColumnEnd(items, activeId, status);
}

function moveAcrossColumns(
  items: BacklogItem[],
  activeId: string,
  status: BacklogStatus,
  overId: string,
  side: "before" | "after",
) {
  const updatedItems = items.map((item) => (item.id === activeId ? { ...item, status } : item));
  const columnItems = updatedItems.filter((item) => item.status === status);
  const others = updatedItems.filter((item) => item.status !== status);
  return [...others, ...getReorderedColumnItems(columnItems, activeId, overId, side)];
}

function resolveOverStatus(items: BacklogItem[], overId: string): BacklogStatus | null {
  return overId.startsWith("column:")
    ? (overId.replace("column:", "") as BacklogStatus)
    : findItemStatus(items, overId);
}

function calculateInsertedSortOrder(
  prevSortOrder: number | null,
  nextSortOrder: number | null,
): number {
  if (prevSortOrder === null && nextSortOrder === null) {
    return 1000;
  }

  if (prevSortOrder === null) {
    return (nextSortOrder as number) - 1000;
  }

  if (nextSortOrder === null) {
    return prevSortOrder + 1000;
  }

  return (prevSortOrder + nextSortOrder) / 2;
}

export function resolveDragOverItems({
  items,
  activeId,
  overId,
  overRect,
  pointerY,
  isMobileLayout,
}: DragOverResolutionInput): BacklogItem[] {
  if (activeId === overId) {
    return items;
  }

  const activeItem = items.find((item) => item.id === activeId);
  if (!activeItem) {
    return items;
  }

  const overStatus = resolveOverStatus(items, overId);
  if (!overStatus) {
    return items;
  }

  if (isMobileLayout && activeItem.status !== overStatus) {
    return items;
  }

  if (activeItem.status === overStatus) {
    if (overId.startsWith("column:")) {
      return items;
    }

    return reorderWithinColumn(
      items,
      overStatus,
      activeId,
      overId,
      resolveDropSide(pointerY, overRect),
    );
  }

  if (overId.startsWith("column:")) {
    return moveToColumnEdge(items, activeId, overStatus);
  }

  return moveAcrossColumns(
    items,
    activeId,
    overStatus,
    overId,
    resolveDropSide(pointerY, overRect),
  );
}

export function resolveDropPersistence({
  items,
  localItems,
  activeId,
}: DropPersistenceInput): DropPersistence | null {
  const draggedItem = localItems.find((item) => item.id === activeId);
  if (!draggedItem) {
    return null;
  }

  const columnOrder = localItems
    .filter((item) => item.status === draggedItem.status)
    .map((item) => item.id);
  const insertedIndex = columnOrder.indexOf(activeId);
  const prevId = insertedIndex > 0 ? columnOrder[insertedIndex - 1] : null;
  const nextId = insertedIndex < columnOrder.length - 1 ? columnOrder[insertedIndex + 1] : null;

  const prevItem = prevId ? items.find((item) => item.id === prevId) : null;
  const nextItem = nextId ? items.find((item) => item.id === nextId) : null;

  return {
    activeId,
    status: draggedItem.status,
    sortOrder: calculateInsertedSortOrder(
      prevItem?.sort_order ?? null,
      nextItem?.sort_order ?? null,
    ),
  };
}
