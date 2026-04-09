import { useBacklogFeedback } from "./useBacklogFeedback.tsx";
import { useBacklogItems } from "./useBacklogItems.ts";

export function useBoardPageResources() {
  const { feedback, feedbackUi } = useBacklogFeedback();
  const { items, setItems, isLoading, error, loadItems } = useBacklogItems();

  return {
    feedback,
    feedbackUi,
    items,
    setItems,
    isLoading,
    error,
    loadItems,
  };
}
