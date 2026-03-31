import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import {
  buildMoveToStatusConfirmMessage,
  getTopSortOrder,
  planBacklogItemUpserts,
} from "../backlog-item-utils.ts";
import { upsertBacklogItemsToStatus } from "../backlog-repository.ts";
import { upsertTmdbWork } from "../work-repository.ts";
import type { BacklogItem } from "../types.ts";

type Props = {
  items: BacklogItem[];
  session: Session;
  loadItems: () => Promise<void>;
  onItemDeleted: (itemId: string) => void;
  onWorksAdded: () => void;
};

export function useBacklogActions({
  items,
  session,
  loadItems,
  onItemDeleted,
  onWorksAdded,
}: Props) {
  const handleDeleteItem = async (itemId: string) => {
    const { error: deleteError } = await supabase.from("backlog_items").delete().eq("id", itemId);

    if (deleteError) {
      window.alert(`削除に失敗しました: ${deleteError.message}`);
      return;
    }

    onItemDeleted(itemId);
    await loadItems();
  };

  const handleMarkAsWatched = async (itemId: string) => {
    const sortOrder = getTopSortOrder(items, "watched");

    const { error: updateError } = await supabase
      .from("backlog_items")
      .update({ status: "watched", sort_order: sortOrder })
      .eq("id", itemId);

    if (updateError) {
      window.alert(`変更に失敗しました: ${updateError.message}`);
      return;
    }

    await loadItems();
  };

  const handleAddTmdbWorksToStacked = async (results: TmdbSearchResult[]) => {
    if (results.length === 0) return;

    const workIds: string[] = [];
    for (const result of results) {
      const { data, error } = await upsertTmdbWork(result, session.user.id);
      if (error || !data) {
        console.error(`追加に失敗: ${result.title}`, error);
        continue;
      }
      workIds.push(data.id);
    }

    if (workIds.length === 0) {
      window.alert("作品の追加に失敗しました");
      return;
    }

    const plan = planBacklogItemUpserts(items, workIds, "stacked");
    const confirmMessage = buildMoveToStatusConfirmMessage(
      plan.existingOtherItems,
      "stacked",
      `${results.length}件の作品`,
    );
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    if (plan.actions.length === 0) {
      window.alert("選択した作品はすでにストックにあります");
      return;
    }

    const { error: insertError } = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      workIds,
      "stacked",
      { primaryPlatform: null, note: null },
    );

    if (insertError) {
      window.alert(`追加に失敗しました: ${insertError}`);
      return;
    }

    await loadItems();
    onWorksAdded();
  };

  return { handleDeleteItem, handleMarkAsWatched, handleAddTmdbWorksToStacked };
}
