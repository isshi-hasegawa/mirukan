import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { BacklogItem } from "../types.ts";
import { useBacklogActions } from "./useBacklogActions.ts";
import { useBacklogDnd } from "./useBacklogDnd.ts";
import { useBacklogFeedback } from "./useBacklogFeedback.tsx";
import { useBacklogItems } from "./useBacklogItems.ts";
import { useBoardPageLayout } from "./useBoardPageLayout.ts";
import { useBoardPageState } from "./useBoardPageState.ts";

type UseBoardPageControllerOptions = {
  session: Session;
};

export function useBoardPageController({ session }: UseBoardPageControllerOptions) {
  const { isMobileLayout } = useBoardPageLayout();
  const { feedback, feedbackUi } = useBacklogFeedback();
  const { items, isLoading, error, loadItems } = useBacklogItems(session.user.id);
  const boardPageState = useBoardPageState({ isMobileLayout });
  const [localItems, setLocalItems] = useState(items);
  const [optimisticSyncBlockCount, setOptimisticSyncBlockCount] = useState(0);

  const beginOptimisticUpdate = useCallback(() => {
    setOptimisticSyncBlockCount((current) => current + 1);

    let released = false;

    return () => {
      if (released) {
        return;
      }

      released = true;
      setOptimisticSyncBlockCount((current) => Math.max(0, current - 1));
    };
  }, []);

  const dnd = useBacklogDnd({
    items,
    localItems,
    setLocalItems,
    isMobileLayout,
    onAfterDrop: loadItems,
    feedback,
  });

  useEffect(() => {
    if (!dnd.dragItemId && !dnd.isDropSyncPending && optimisticSyncBlockCount === 0) {
      setLocalItems(items);
    }
  }, [dnd.dragItemId, dnd.isDropSyncPending, items, optimisticSyncBlockCount]);

  const actions = useBacklogActions({
    items: localItems,
    session,
    loadItems,
    setLocalItems,
    beginOptimisticUpdate,
    onItemDeleted: boardPageState.handleItemDeleted,
    onWorksAdded: boardPageState.handleNavigateToStacked,
    feedback,
  });

  const detailItem = boardPageState.detailModal.openItemId
    ? (dnd.localItems.find((item) => item.id === boardPageState.detailModal.openItemId) ?? null)
    : null;

  const isDragging = dnd.dragItemId !== null;

  return {
    isMobileLayout,
    items,
    isLoading,
    error,
    feedback,
    feedbackUi,
    board: {
      items: dnd.localItems,
      isDragging,
      isMobileLayout,
      isMobileDragging: isMobileLayout && isDragging,
      selectedTabStatus: boardPageState.selectedTabStatus,
      onTabChange: boardPageState.setSelectedTabStatus,
      onOpenAddModal: boardPageState.handleOpenAddModal,
      onOpenDetail: boardPageState.handleOpenDetail,
      onDeleteItem: actions.handleDeleteItem,
      onMarkAsWatched: actions.handleMarkAsWatched,
      columnRef: boardPageState.handleColumnRef,
    },
    dnd: {
      sensors: dnd.sensors,
      handleDragStart: dnd.handleDragStart,
      handleDragOver: dnd.handleDragOver,
      handleDragCancel: dnd.handleDragCancel,
      handleDragEnd: dnd.handleDragEnd,
      dragItemId: dnd.dragItemId,
      isDropSyncPending: dnd.isDropSyncPending,
      localItems: dnd.localItems,
    },
    addModal: {
      isOpen: boardPageState.isAddModalOpen,
      items: localItems,
      session,
      onClose: boardPageState.handleCloseAddModal,
      onOptimisticAdd: (optimisticItems: BacklogItem[]) => {
        setLocalItems((current) => [...optimisticItems, ...current]);
      },
      onRollbackOptimisticAdd: (optimisticItemIds: string[]) => {
        setLocalItems((current) => current.filter((item) => !optimisticItemIds.includes(item.id)));
      },
      beginOptimisticUpdate,
      onAdded: async () => {
        boardPageState.handleNavigateToStacked();
        await loadItems();
      },
    },
    detailModal: {
      item: detailItem,
      isOpen: boardPageState.detailModal.openItemId !== null,
      state: boardPageState.detailModal,
      items: dnd.localItems,
      onStateChange: boardPageState.setDetailModal,
      onClose: boardPageState.handleCloseDetail,
      onReload: loadItems,
    },
  };
}
