import type { Session } from "@supabase/supabase-js";
import type { BacklogItem } from "../types.ts";
import type { BacklogFeedback } from "../ui-feedback.ts";
import { useBacklogActions } from "./useBacklogActions.ts";
import { useBacklogDnd } from "./useBacklogDnd.ts";

type UseBoardPageInteractionsOptions = {
  items: BacklogItem[];
  session: Session;
  isMobileLayout: boolean;
  loadItems: () => Promise<void>;
  onItemDeleted: (itemId: string) => void;
  onWorksAdded: () => void;
  feedback: BacklogFeedback;
};

export function useBoardPageInteractions({
  items,
  session,
  isMobileLayout,
  loadItems,
  onItemDeleted,
  onWorksAdded,
  feedback,
}: UseBoardPageInteractionsOptions) {
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
    onItemDeleted,
    onWorksAdded,
    feedback,
  });

  return {
    dnd,
    actions,
  };
}
