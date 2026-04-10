import type { Session } from "@supabase/supabase-js";
import { useBoardPageInteractions } from "./useBoardPageInteractions.ts";
import { useBoardPageLayout } from "./useBoardPageLayout.ts";
import { useBoardPageResources } from "./useBoardPageResources.ts";
import { useBoardPageState } from "./useBoardPageState.ts";

type UseBoardPageControllerOptions = {
  session: Session;
};

export function useBoardPageController({ session }: UseBoardPageControllerOptions) {
  const { isMobileLayout } = useBoardPageLayout();
  const { feedback, feedbackUi, items, isLoading, error, loadItems } = useBoardPageResources();
  const boardPageState = useBoardPageState({
    isMobileLayout,
  });

  const { dnd, actions } = useBoardPageInteractions({
    items,
    session,
    isMobileLayout,
    loadItems,
    onItemDeleted: boardPageState.handleItemDeleted,
    onWorksAdded: boardPageState.handleWorksAdded,
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
        boardPageState.handleAdded();
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
      onReload: () => loadItems(),
    },
  };
}
