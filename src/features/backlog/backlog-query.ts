import { fetchBacklogItems } from "./backlog-repository.ts";

export const backlogItemsQueryKey = ["backlog-items"] as const;

export async function fetchBacklogItemsQuery() {
  const result = await fetchBacklogItems();

  if (result.error) {
    throw new Error(result.error);
  }

  return result.data;
}
