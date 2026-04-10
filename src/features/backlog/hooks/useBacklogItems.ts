import { useCallback, useEffect, useState } from "react";
import { fetchBacklogItems } from "../backlog-repository.ts";
import type { BacklogItem } from "../types.ts";

export function useBacklogItems() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchBacklogItems();
      setItems(result.data);
      setError(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "不明なエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return { items, setItems, isLoading, error, loadItems };
}
