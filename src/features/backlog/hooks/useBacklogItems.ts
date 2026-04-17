import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { backlogItemsQueryKey, fetchBacklogItemsQuery } from "../backlog-query.ts";

export function useBacklogItems(userId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: backlogItemsQueryKey(userId),
    queryFn: fetchBacklogItemsQuery,
    retry: false,
  });

  const loadItems = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: backlogItemsQueryKey(userId) });
  }, [queryClient, userId]);
  const error = query.data || !(query.error instanceof Error) ? null : query.error.message;

  return {
    items: query.data ?? [],
    isLoading: query.isPending,
    // キャッシュデータがない場合のみエラーを表示（バックグラウンド refetch エラーはキャッシュがあれば無視）
    error,
    loadItems,
  };
}
