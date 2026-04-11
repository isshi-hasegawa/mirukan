import type { Dispatch, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import {
  buildMoveToStatusConfirmMessage,
  getTopSortOrder,
  planBacklogItemUpserts,
} from "../backlog-item-utils.ts";
import {
  deleteBacklogItem,
  updateBacklogItem,
  upsertBacklogItemsToStatus,
} from "../backlog-repository.ts";
import { upsertTmdbWork } from "../work-repository.ts";
import type { BacklogItem } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";

type Props = {
  items: BacklogItem[];
  session: Session;
  loadItems: () => Promise<void>;
  setLocalItems: Dispatch<SetStateAction<BacklogItem[]>>;
  beginOptimisticUpdate: () => () => void;
  onItemDeleted: (itemId: string) => void;
  onWorksAdded: () => void;
  feedback?: BacklogFeedback;
};

function buildWorkFailureMessage(failedTitles: string[], prefix: string) {
  if (failedTitles.length === 0) {
    return null;
  }

  return `${prefix}: ${failedTitles.join("、")}`;
}

export function useBacklogActions({
  items,
  session,
  loadItems,
  setLocalItems,
  beginOptimisticUpdate,
  onItemDeleted,
  onWorksAdded,
  feedback = browserBacklogFeedback,
}: Props) {
  const handleDeleteItem = async (itemId: string) => {
    const itemToDelete = items.find((item) => item.id === itemId);
    if (!itemToDelete) {
      return;
    }

    const deletedIndex = items.findIndex((item) => item.id === itemId);
    const releaseOptimisticUpdate = beginOptimisticUpdate();

    setLocalItems((current) => current.filter((item) => item.id !== itemId));
    onItemDeleted(itemId);

    const restoreDeletedItem = () => {
      setLocalItems((current) => {
        if (current.some((item) => item.id === itemId)) {
          return current;
        }

        const nextItems = [...current];
        nextItems.splice(Math.min(deletedIndex, nextItems.length), 0, itemToDelete);
        return nextItems;
      });
    };

    await Promise.resolve(
      feedback.toast({
        message: "削除しました",
        actionLabel: "元に戻す",
        durationMs: 5000,
        onAction: () => {
          restoreDeletedItem();
          releaseOptimisticUpdate();
        },
        onClose: async () => {
          const { error: deleteError } = await deleteBacklogItem(itemId);

          if (deleteError) {
            restoreDeletedItem();
            await Promise.resolve(feedback.alert(`削除に失敗しました: ${deleteError}`));
            releaseOptimisticUpdate();
            return;
          }

          try {
            await loadItems();
          } finally {
            releaseOptimisticUpdate();
          }
        },
      }),
    );

    return;
  };

  const handleMarkAsWatched = async (itemId: string) => {
    const sortOrder = getTopSortOrder(items, "watched");

    const { error: updateError } = await updateBacklogItem(itemId, {
      status: "watched",
      sort_order: sortOrder,
    });

    if (updateError) {
      await Promise.resolve(feedback.alert(`変更に失敗しました: ${updateError}`));
      return;
    }

    await loadItems();
  };

  const handleAddTmdbWorksToStacked = async (results: TmdbSearchResult[]) => {
    if (results.length === 0) return;

    const workIds: string[] = [];
    const failedTitles: string[] = [];
    for (const result of results) {
      const { data, error } = await upsertTmdbWork(result, session.user.id);
      if (error || !data) {
        console.error(`追加に失敗: ${result.title}`, error);
        failedTitles.push(result.title);
        continue;
      }
      workIds.push(data.id);
    }

    if (workIds.length === 0) {
      const workFailureMessage =
        buildWorkFailureMessage(failedTitles, "作品の追加に失敗しました") ??
        "作品の追加に失敗しました";
      await Promise.resolve(feedback.alert(workFailureMessage));
      return;
    }

    const plan = planBacklogItemUpserts(items, workIds, "stacked");
    const confirmMessage = buildMoveToStatusConfirmMessage(
      plan.existingOtherItems,
      "stacked",
      `${workIds.length}件の作品`,
    );
    const shouldProceed =
      !confirmMessage || (await Promise.resolve(feedback.confirm(confirmMessage)));
    if (!shouldProceed) {
      return;
    }

    if (plan.actions.length === 0) {
      const workFailureMessage = buildWorkFailureMessage(
        failedTitles,
        "一部の作品を追加できませんでした",
      );
      await Promise.resolve(
        feedback.alert(
          workFailureMessage
            ? `${workFailureMessage}\n選択した作品はすでにストックにあります`
            : "選択した作品はすでにストックにあります",
        ),
      );
      return;
    }

    const { error: insertError } = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      workIds,
      "stacked",
      { primary_platform: null, note: null },
    );

    if (insertError) {
      await Promise.resolve(feedback.alert(`追加に失敗しました: ${insertError}`));
      return;
    }

    await loadItems();
    onWorksAdded();

    const workFailureMessage = buildWorkFailureMessage(
      failedTitles,
      "一部の作品を追加できませんでした",
    );
    if (workFailureMessage) {
      await Promise.resolve(feedback.alert(workFailureMessage));
    }
  };

  return { handleDeleteItem, handleMarkAsWatched, handleAddTmdbWorksToStacked };
}
