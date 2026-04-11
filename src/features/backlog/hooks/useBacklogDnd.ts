import { useState, type Dispatch, type SetStateAction } from "react";
import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { supabase } from "../../../lib/supabase.ts";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";

type Props = {
  items: BacklogItem[];
  localItems: BacklogItem[];
  setLocalItems: Dispatch<SetStateAction<BacklogItem[]>>;
  isMobileLayout: boolean;
  onAfterDrop: () => Promise<void>;
  feedback?: BacklogFeedback;
};

type RectLike = Pick<DOMRect, "top" | "height">;
type TouchListKey = "touches" | "changedTouches";

function findItemStatus(items: BacklogItem[], id: string): BacklogStatus | null {
  return items.find((i) => i.id === id)?.status ?? null;
}

function getDropSideFromRect(rect: RectLike, clientY: number) {
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function getClientYFromPointerEvent(
  event: MouseEvent | TouchEvent | null | undefined,
  rect: RectLike,
  touchListKey: TouchListKey = "touches",
) {
  const fallbackY = rect.top + rect.height / 2;

  if (!event) {
    return fallbackY;
  }

  if ("touches" in event && event.type.includes("touch")) {
    const touchList = touchListKey === "changedTouches" ? event.changedTouches : event.touches;
    return touchList?.[0]?.clientY ?? fallbackY;
  }

  return "clientY" in event ? (event.clientY ?? fallbackY) : fallbackY;
}

function getReorderedColumnItems(
  columnItems: BacklogItem[],
  activeId: string,
  overId: string,
  side: "before" | "after",
) {
  const activeIdx = columnItems.findIndex((i) => i.id === activeId);
  const overIdx = columnItems.findIndex((i) => i.id === overId);
  if (activeIdx === -1 || overIdx === -1) return columnItems;

  const baseItems = columnItems.filter((i) => i.id !== activeId);
  const targetIdx = baseItems.findIndex((i) => i.id === overId);
  if (targetIdx === -1) return columnItems;

  const insertionIdx = side === "before" ? targetIdx : targetIdx + 1;
  const activeItem = columnItems[activeIdx];

  return [...baseItems.slice(0, insertionIdx), activeItem, ...baseItems.slice(insertionIdx)];
}

function moveItemToColumnEnd(items: BacklogItem[], activeId: string, status: BacklogStatus) {
  const activeItem = items.find((i) => i.id === activeId);
  if (!activeItem) return items;

  const updatedItems = items.map((i) => (i.id === activeId ? { ...i, status } : i));
  const columnItems = updatedItems.filter((i) => i.status === status && i.id !== activeId);
  const others = updatedItems.filter((i) => i.status !== status);

  return [...others, ...columnItems, { ...activeItem, status }];
}

function moveItemToColumnTop(items: BacklogItem[], activeId: string, status: BacklogStatus) {
  const activeItem = items.find((i) => i.id === activeId);
  if (!activeItem) return items;

  const updatedItems = items.map((i) => (i.id === activeId ? { ...i, status } : i));
  const columnItems = updatedItems.filter((i) => i.status === status && i.id !== activeId);
  const others = updatedItems.filter((i) => i.status !== status);

  return [...others, { ...activeItem, status }, ...columnItems];
}

function resolveDropSide(
  activatorEvent: DragOverEvent["activatorEvent"],
  rect: RectLike,
): "before" | "after" {
  const clientY = getClientYFromPointerEvent(
    activatorEvent as MouseEvent | TouchEvent | null | undefined,
    rect,
  );
  return getDropSideFromRect(rect, clientY);
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

export function useBacklogDnd({
  items,
  localItems,
  setLocalItems,
  isMobileLayout,
  onAfterDrop,
  feedback = browserBacklogFeedback,
}: Props) {
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [isDropSyncPending, setIsDropSyncPending] = useState(false);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 300, tolerance: 8 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    setDragItemId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over, activatorEvent } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    setLocalItems((prev) => {
      const activeItem = prev.find((i) => i.id === activeId);
      if (!activeItem) return prev;
      const activeStatus = activeItem.status;
      const overStatus = overId.startsWith("column:")
        ? (overId.replace("column:", "") as BacklogStatus)
        : findItemStatus(prev, overId);

      if (!overStatus) return prev;
      if (isMobileLayout && activeStatus !== overStatus) return prev;

      if (activeStatus === overStatus) {
        // 同列内での並び替え
        if (overId.startsWith("column:")) return prev;
        const colItems = prev.filter((i) => i.status === overStatus);
        const others = prev.filter((i) => i.status !== overStatus);
        const side = resolveDropSide(activatorEvent, over.rect);
        return [...others, ...getReorderedColumnItems(colItems, activeId, overId, side)];
      }

      // 列またぎ: ステータスを変更して over アイテムの位置に挿入
      // watched への列端ドロップは先頭挿入（handleMarkAsWatched と同じ並び順）
      if (overId.startsWith("column:")) {
        return overStatus === "watched"
          ? moveItemToColumnTop(prev, activeId, overStatus)
          : moveItemToColumnEnd(prev, activeId, overStatus);
      }

      const withUpdatedStatus = prev.map((i) =>
        i.id === activeId ? { ...i, status: overStatus } : i,
      );
      const newColItems = withUpdatedStatus.filter((i) => i.status === overStatus);
      const others = withUpdatedStatus.filter((i) => i.status !== overStatus);
      const side = resolveDropSide(activatorEvent, over.rect);
      return [...others, ...getReorderedColumnItems(newColItems, activeId, overId, side)];
    });
  };

  const handleDragCancel = () => {
    setIsDropSyncPending(false);
    setDragItemId(null);
    setLocalItems(items);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragItemId(null);

    if (!over) {
      setIsDropSyncPending(false);
      setLocalItems(items);
      return;
    }

    const activeId = active.id as string;
    const draggedItem = localItems.find((i) => i.id === activeId);
    if (!draggedItem) {
      setIsDropSyncPending(false);
      setLocalItems(items);
      return;
    }

    const targetStatus = draggedItem.status;
    const columnOrder = localItems.filter((i) => i.status === targetStatus).map((i) => i.id);
    const insertedIndex = columnOrder.indexOf(activeId);

    const prevId = insertedIndex > 0 ? columnOrder[insertedIndex - 1] : null;
    const nextId = insertedIndex < columnOrder.length - 1 ? columnOrder[insertedIndex + 1] : null;

    // sort_order はサーバーアイテムの値を使って補間する
    const prevItem = prevId ? items.find((i) => i.id === prevId) : null;
    const nextItem = nextId ? items.find((i) => i.id === nextId) : null;
    const sortOrder = calculateInsertedSortOrder(
      prevItem?.sort_order ?? null,
      nextItem?.sort_order ?? null,
    );

    setIsDropSyncPending(true);
    try {
      const { error: updateError } = await supabase
        .from("backlog_items")
        .update({ status: targetStatus, sort_order: sortOrder })
        .eq("id", activeId);

      if (updateError) {
        await Promise.resolve(feedback.alert(`ドラッグ移動に失敗しました: ${updateError.message}`));
        setLocalItems(items);
        return;
      }

      await onAfterDrop();
    } finally {
      setIsDropSyncPending(false);
    }
  };

  return {
    dragItemId,
    isDropSyncPending,
    localItems,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
  };
}
