import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { backlogItemsQueryKey, fetchBacklogItemsQuery } from "../backlog-query.ts";

export function useBacklogItems() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: backlogItemsQueryKey,
    queryFn: fetchBacklogItemsQuery,
    retry: false,
  });

  const loadItems = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: backlogItemsQueryKey });
  }, [queryClient]);

  return {
    items: query.data ?? [],
    isLoading: query.isPending,
    error: query.error instanceof Error ? query.error.message : null,
    loadItems,
  };
}
