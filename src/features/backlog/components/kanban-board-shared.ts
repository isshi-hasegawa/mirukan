import type { ReactNode } from "react";
import type { BacklogItem, BacklogStatus, BoardMode, ViewingMode } from "../types.ts";

export type KanbanColumnProps = {
  boardMode: BoardMode;
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
