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
import { supabase } from "../../../lib/supabase.ts";
import type { BacklogItem } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";
import { resolveDragOverItems, resolveDropPersistence } from "./useBacklogDnd.logic.ts";

const EMPTY_PENDING_DELETES: ReadonlySet<string> = new Set();

type Props = Readonly<{
  items: BacklogItem[];
  pendingDeleteIds?: ReadonlySet<string>;
  isMobileLayout: boolean;
  onAfterDrop: () => Promise<void>;
  feedback?: BacklogFeedback;
}>;

export function useBacklogDnd({
  items,
  pendingDeleteIds = EMPTY_PENDING_DELETES,
  isMobileLayout,
  onAfterDrop,
  feedback = browserBacklogFeedback,
}: Props) {
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [isDropSyncPending, setIsDropSyncPending] = useState(false);
  const [localItems, setLocalItems] = useState<BacklogItem[]>(items);

  // サーバーデータが更新されたら、ドラッグ中またはドロップ反映待ちでない場合に同期
  // 楽観的削除中の項目は除外してサーバーデータで上書きされないようにする
  useEffect(() => {
    if (!dragItemId && !isDropSyncPending) {
      setLocalItems(
        pendingDeleteIds.size > 0 ? items.filter((i) => !pendingDeleteIds.has(i.id)) : items,
      );
    }
  }, [items, dragItemId, isDropSyncPending, pendingDeleteIds]);

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
    if (!over) {
      return;
    }

    const activeRect = active.rect.current.translated ?? active.rect.current.initial;
    if (!activeRect) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    setLocalItems((prev) => {
      return resolveDragOverItems({
        items: prev,
        activeId,
        overId,
        overRect: over.rect,
        activeRect,
        isMobileLayout,
      });
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
    const dropPersistence = resolveDropPersistence({ items, localItems, activeId });
    if (!dropPersistence) {
      setIsDropSyncPending(false);
      setLocalItems(items);
      return;
    }

    setIsDropSyncPending(true);
    try {
      const { error: updateError } = await supabase
        .from("backlog_items")
        .update({ status: dropPersistence.status, sort_order: dropPersistence.sortOrder })
        .eq("id", dropPersistence.activeId);

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
    setLocalItems,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
  };
}
