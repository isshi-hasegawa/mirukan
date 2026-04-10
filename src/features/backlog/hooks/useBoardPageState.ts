import { useRef, useState } from "react";
import { createDetailModalState } from "../helpers.ts";
import type { BacklogStatus, DetailModalState } from "../types.ts";

type Props = {
  isMobileLayout: boolean;
};

export function useBoardPageState({ isMobileLayout }: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalState>(createDetailModalState(null));
  const [selectedTabStatus, setSelectedTabStatus] = useState<BacklogStatus>("stacked");
  const columnRefs = useRef<Partial<Record<BacklogStatus, HTMLElement | null>>>({});

  const scrollToStackedColumn = () => {
    const col = columnRefs.current.stacked;
    col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleOpenDetail = (itemId: string) => {
    setDetailModal(createDetailModalState(itemId));
  };

  const handleCloseDetail = () => {
    setDetailModal(createDetailModalState(null));
  };

  const handleAdded = () => {
    if (isMobileLayout) {
      setSelectedTabStatus("stacked");
      return;
    }

    scrollToStackedColumn();
  };

  const handleItemDeleted = (itemId: string) => {
    if (detailModal.openItemId === itemId) {
      setDetailModal(createDetailModalState(null));
    }
  };

  const handleWorksAdded = () => {
    if (isMobileLayout) {
      setSelectedTabStatus("stacked");
      return;
    }

    scrollToStackedColumn();
  };

  const handleColumnRef = (status: BacklogStatus, el: HTMLElement | null) => {
    columnRefs.current[status] = el;
  };

  return {
    isAddModalOpen,
    detailModal,
    selectedTabStatus,
    setDetailModal,
    setSelectedTabStatus,
    handleOpenAddModal,
    handleCloseAddModal,
    handleOpenDetail,
    handleCloseDetail,
    handleAdded,
    handleItemDeleted,
    handleWorksAdded,
    handleColumnRef,
  };
}
