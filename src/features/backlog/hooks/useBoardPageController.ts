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
    session,
    loadItems,
    onItemDeleted: boardPageState.handleItemDeleted,
    onWorksAdded: boardPageState.handleNavigateToStacked,
    feedback,
  });

  const detailItem = boardPageState.detailModal.openItemId
    ? (items.find((item) => item.id === boardPageState.detailModal.openItemId) ?? null)
    : null;

  return {
    isMobileLayout,
    items,
    isLoading,
    error,
    feedback,
    feedbackUi,
    board: {
      items,
      dropIndicator: dnd.dropIndicator,
      isMobileLayout,
      isMobileDragging: isMobileLayout && dnd.dragItemId !== null,
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
      handleDragEnd: dnd.handleDragEnd,
      dragItemId: dnd.dragItemId,
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
      items,
      onStateChange: boardPageState.setDetailModal,
      onClose: boardPageState.handleCloseDetail,
      onReload: loadItems,
    },
  };
}
