import type { ReactNode } from "react";
import type { BacklogItem, BacklogStatus, ViewingMode } from "../types.ts";

export type KanbanColumnProps = {
  status: BacklogStatus;
  items: BacklogItem[];
  extra?: ReactNode;
  activeViewingMode: ViewingMode | null;
  isMobileLayout: boolean;
  onOpenAddModal: () => void;
  onOpenDetail: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
  onViewingModeToggle?: (mode: ViewingMode) => void;
};
