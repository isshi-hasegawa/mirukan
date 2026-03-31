import { supabase } from "../../lib/supabase.ts";
import {
  getTopSortOrder,
  planBacklogItemUpserts,
  type BacklogItemUpdate,
} from "./backlog-item-utils.ts";
import type { BacklogItem, BacklogStatus } from "./types.ts";

export async function updateBacklogItem(
  itemId: string,
  update: BacklogItemUpdate,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("backlog_items").update(update).eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

type UpsertBacklogItemsToStatusOptions = {
  note: string | null;
  primaryPlatform: string | null;
};

export async function upsertBacklogItemsToStatus(
  userId: string,
  items: BacklogItem[],
  workIds: string[],
  targetStatus: BacklogStatus,
  options: UpsertBacklogItemsToStatusOptions,
): Promise<{ error: string | null }> {
  const plan = planBacklogItemUpserts(items, workIds, targetStatus);
  if (plan.actions.length === 0) {
    return { error: null };
  }

  let sortOrder = getTopSortOrder(items, targetStatus);
  const rows = plan.actions.map((action) => {
    const row =
      action.type === "move"
        ? {
            user_id: userId,
            work_id: action.item.works!.id,
            status: targetStatus,
            primary_platform: action.item.primary_platform,
            note: action.item.note,
            sort_order: sortOrder,
          }
        : {
            user_id: userId,
            work_id: action.workId,
            status: targetStatus,
            primary_platform: options.primaryPlatform,
            note: options.note,
            sort_order: sortOrder,
          };
    sortOrder += 1000;
    return row;
  });

  const { error } = await supabase
    .from("backlog_items")
    .upsert(rows, { onConflict: "user_id,work_id" });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
