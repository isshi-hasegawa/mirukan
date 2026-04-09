import type { ReactNode } from "react";
import type { BacklogItem, BacklogStatus, ViewingMode } from "../types.ts";

export type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus }
  | { type: "top-slot"; status: BacklogStatus }
  | { type: "bottom-slot"; status: BacklogStatus };

export type KanbanColumnProps = {
  status: BacklogStatus;
  items: BacklogItem[];
  extra?: ReactNode;
  activeViewingMode: ViewingMode | null;
  isMobileLayout: boolean;
  dropIndicator: DropIndicator | null;
  onOpenAddModal: () => void;
  onOpenDetail: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
  onViewingModeToggle?: (mode: ViewingMode) => void;
};
