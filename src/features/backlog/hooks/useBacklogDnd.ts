import { useState } from "react";
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
import { getSortOrderForDrop } from "../backlog-item-utils.ts";
import { getClientYFromPointerEvent, getDropIndicator, resolveDropTarget } from "../helpers.ts";
import type { BacklogItem, DropIndicator } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";

type Props = {
  items: BacklogItem[];
  isMobileLayout: boolean;
  onAfterDrop: () => Promise<void>;
  feedback?: BacklogFeedback;
};

export function useBacklogDnd({
  items,
  isMobileLayout,
  onAfterDrop,
  feedback = browserBacklogFeedback,
}: Props) {
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

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
    const { over } = event;
    if (!over) {
      setDropIndicator(null);
      return;
    }

    const overId = over.id as string;
    const rect = over.rect;
    const clientY = getClientYFromPointerEvent(
      event.activatorEvent as MouseEvent | TouchEvent | null | undefined,
      rect,
    );
    setDropIndicator(getDropIndicator(overId, rect, clientY));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragItemId(null);
    setDropIndicator(null);

    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    const target = resolveDropTarget(
      items,
      overId,
      over.rect,
      getClientYFromPointerEvent(
        event.activatorEvent as MouseEvent | TouchEvent | null | undefined,
        over.rect,
        "changedTouches",
      ),
    );
    if (!target) return;

    const { status: targetStatus, targetItemId, side } = target;

    // モバイルレイアウトでは列間ドラッグを無効化
    if (isMobileLayout) {
      const dragItem = items.find((i) => i.id === draggedId);
      if (dragItem && dragItem.status !== targetStatus) return;
    }

    const sortOrder = getSortOrderForDrop(items, draggedId, targetStatus, targetItemId, side);

    const { error: updateError } = await supabase
      .from("backlog_items")
      .update({ status: targetStatus, sort_order: sortOrder })
      .eq("id", draggedId);

    if (updateError) {
      await Promise.resolve(
        feedback.alert(`ドラッグ移動に失敗しました: ${updateError.message}`),
      );
      return;
    }

    await onAfterDrop();
  };

  return { dragItemId, dropIndicator, sensors, handleDragStart, handleDragOver, handleDragEnd };
}
