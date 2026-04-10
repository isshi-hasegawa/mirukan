import { useEffect, useState } from "react";
import {
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { supabase } from "../../../lib/supabase.ts";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";

type Props = {
  items: BacklogItem[];
  isMobileLayout: boolean;
  onAfterDrop: () => Promise<void>;
  feedback?: BacklogFeedback;
};

function findItemStatus(items: BacklogItem[], id: string): BacklogStatus | null {
  return items.find((i) => i.id === id)?.status ?? null;
}

export function useBacklogDnd({
  items,
  isMobileLayout,
  onAfterDrop,
  feedback = browserBacklogFeedback,
}: Props) {
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [isDropSyncPending, setIsDropSyncPending] = useState(false);
  const [localItems, setLocalItems] = useState<BacklogItem[]>(items);

  // サーバーデータが更新されたら、ドラッグ中またはドロップ反映待ちでない場合に同期
  useEffect(() => {
    if (!dragItemId && !isDropSyncPending) {
      setLocalItems(items);
    }
  }, [items, dragItemId, isDropSyncPending]);

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
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeStatus = findItemStatus(localItems, activeId);
    const overStatus = overId.startsWith("column:")
      ? (overId.replace("column:", "") as BacklogStatus)
      : findItemStatus(localItems, overId);

    if (!activeStatus || !overStatus) return;
    if (isMobileLayout && activeStatus !== overStatus) return;

    setLocalItems((prev) => {
      const activeItem = prev.find((i) => i.id === activeId);
      if (!activeItem) return prev;

      if (activeStatus === overStatus) {
        // 同列内での並び替え
        if (overId.startsWith("column:")) return prev;
        const colItems = prev.filter((i) => i.status === overStatus);
        const others = prev.filter((i) => i.status !== overStatus);
        const oldIdx = colItems.findIndex((i) => i.id === activeId);
        const newIdx = colItems.findIndex((i) => i.id === overId);
        if (oldIdx === -1 || newIdx === -1) return prev;
        return [...others, ...arrayMove(colItems, oldIdx, newIdx)];
      } else {
        // 列またぎ: ステータスを変更して over アイテムの位置に挿入
        const withUpdatedStatus = prev.map((i) =>
          i.id === activeId ? { ...i, status: overStatus } : i,
        );

        if (overId.startsWith("column:")) {
          return withUpdatedStatus;
        }

        const newColItems = withUpdatedStatus.filter((i) => i.status === overStatus);
        const others = withUpdatedStatus.filter((i) => i.status !== overStatus);
        const activeIdx = newColItems.findIndex((i) => i.id === activeId);
        const overIdx = newColItems.findIndex((i) => i.id === overId);
        if (activeIdx === -1 || overIdx === -1) return withUpdatedStatus;
        return [...others, ...arrayMove(newColItems, activeIdx, overIdx)];
      }
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

    let sortOrder: number;
    if (!prevItem && !nextItem) {
      sortOrder = 1000;
    } else if (!prevItem) {
      sortOrder = nextItem!.sort_order - 1000;
    } else if (!nextItem) {
      sortOrder = prevItem.sort_order + 1000;
    } else {
      sortOrder = (prevItem.sort_order + nextItem.sort_order) / 2;
    }

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
    localItems,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
  };
}
