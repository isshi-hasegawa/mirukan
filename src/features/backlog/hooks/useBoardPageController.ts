import type { Session } from "@supabase/supabase-js";
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

  const dnd = useBacklogDnd({
    items,
    isMobileLayout,
    onAfterDrop: loadItems,
    feedback,
  });

  const actions = useBacklogActions({
    items,
    localItems: dnd.localItems,
    setLocalItems: dnd.setLocalItems,
    session,
    loadItems,
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
      localItems: dnd.localItems,
    },
    addModal: {
      isOpen: boardPageState.isAddModalOpen,
      items,
      session,
      onClose: boardPageState.handleCloseAddModal,
      onAdded: () => {
        boardPageState.handleNavigateToStacked();
        void loadItems();
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
