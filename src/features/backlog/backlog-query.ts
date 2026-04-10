import { fetchBacklogItems } from "./backlog-repository.ts";

export function backlogItemsQueryKey(userId: string) {
  return ["backlog-items", userId] as const;
}

export async function fetchBacklogItemsQuery() {
  const result = await fetchBacklogItems();

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data;
}
