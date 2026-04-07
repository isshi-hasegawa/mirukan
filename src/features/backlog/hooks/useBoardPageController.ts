import type { Session } from "@supabase/supabase-js";
import { useWindowSize } from "./useWindowSize.ts";
import { useBacklogItems } from "./useBacklogItems.ts";
import { useBacklogDnd } from "./useBacklogDnd.ts";
import { useBacklogActions } from "./useBacklogActions.ts";
import { useBacklogFeedback } from "./useBacklogFeedback.tsx";
import { useBoardPageState } from "./useBoardPageState.ts";

type UseBoardPageControllerOptions = {
  session: Session;
};

export function useBoardPageController({ session }: UseBoardPageControllerOptions) {
  const windowWidth = useWindowSize();
  const isMobileLayout = windowWidth <= 720;
  const { feedback, feedbackUi } = useBacklogFeedback();
  const { items, setItems, isLoading, error, loadItems } = useBacklogItems();
  const boardPageState = useBoardPageState({
    isMobileLayout,
    setItems,
  });

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
      onUpdate: boardPageState.handleUpdateItem,
    },
  };
}
