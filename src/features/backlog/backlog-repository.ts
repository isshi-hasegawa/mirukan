import { supabase } from "../../lib/supabase.ts";
import {
  getTopSortOrder,
  normalizeBacklogItems,
  planBacklogItemUpserts,
  type BacklogItemUpdate,
} from "./backlog-item-utils.ts";
import type { BacklogItem, BacklogStatus, PrimaryPlatform } from "./types.ts";

export const BACKLOG_ITEM_SELECT =
  "id, status, display_title, primary_platform, note, sort_order, works(id, title, work_type, source_type, tmdb_id, tmdb_media_type, original_title, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, genres, season_count, season_number, focus_required_score, background_fit_score, completion_load_score, rotten_tomatoes_score, imdb_rating, imdb_votes, metacritic_score)";

export async function fetchBacklogItems(): Promise<{
  data: BacklogItem[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("backlog_items")
    .select(BACKLOG_ITEM_SELECT)
    .order("sort_order")
    .order("created_at");

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: normalizeBacklogItems(data ?? []),
    error: null,
  };
}

export async function deleteBacklogItem(itemId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("backlog_items").delete().eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

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
  display_title: string | null;
  note: string | null;
  primary_platform: PrimaryPlatform;
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

  let sortOrder = getTopSortOrder(items, targetStatus, plan.actions.length);
  const rows = plan.actions.map((action) => {
    const row =
      action.type === "move"
        ? {
            user_id: userId,
            work_id: action.item.works!.id,
            status: targetStatus,
            display_title: action.item.display_title ?? null,
            primary_platform: action.item.primary_platform,
            note: action.item.note,
            sort_order: sortOrder,
          }
        : {
            user_id: userId,
            work_id: action.workId,
            status: targetStatus,
            display_title: options.display_title,
            primary_platform: options.primary_platform,
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
