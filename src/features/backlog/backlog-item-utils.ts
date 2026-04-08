import { statusLabels } from "./constants.ts";
import { normalizePrimaryPlatform } from "./helpers.ts";
import type {
  BacklogItem,
  BacklogItemRow,
  BacklogStatus,
  DetailModalEditableField,
} from "./types.ts";

export function normalizeBacklogItems(rows: unknown[]): BacklogItem[] {
  return rows.flatMap((row) => {
    const item = row as BacklogItemRow;
    const work = Array.isArray(item.works) ? item.works[0] : item.works;

    if (!work) {
      return [];
    }

    return [{ ...item, works: work }];
  });
}

export function getNextSortOrder(items: BacklogItem[], status: BacklogStatus) {
  const currentMax = items
    .filter((item) => item.status === status)
    .reduce((max, item) => Math.max(max, item.sort_order), 0);

  return currentMax + 1000;
}

export function getTopSortOrder(items: BacklogItem[], status: BacklogStatus, count = 1): number {
  const statusItems = items.filter((item) => item.status === status);
  if (statusItems.length === 0) return 1000;
  return Math.min(...statusItems.map((item) => item.sort_order)) - count * 1000;
}

type BacklogUpsertAction = { type: "insert"; workId: string } | { type: "move"; item: BacklogItem };

export function planBacklogItemUpserts(
  items: BacklogItem[],
  workIds: string[],
  targetStatus: BacklogStatus,
): {
  actions: BacklogUpsertAction[];
  existingTargetItems: BacklogItem[];
  existingOtherItems: BacklogItem[];
} {
  const seen = new Set<string>();
  const actions: BacklogUpsertAction[] = [];
  const existingTargetItems: BacklogItem[] = [];
  const existingOtherItems: BacklogItem[] = [];
  const itemsByWorkId = new Map(
    items
      .filter(
        (item): item is BacklogItem & { works: NonNullable<BacklogItem["works"]> } => !!item.works,
      )
      .map((item) => [item.works.id, item] as const),
  );

  for (const workId of workIds) {
    if (seen.has(workId)) continue;
    seen.add(workId);

    const existingItem = itemsByWorkId.get(workId);
    if (!existingItem) {
      actions.push({ type: "insert", workId });
      continue;
    }

    if (existingItem.status === targetStatus) {
      existingTargetItems.push(existingItem);
      continue;
    }

    existingOtherItems.push(existingItem);
    actions.push({ type: "move", item: existingItem });
  }

  return { actions, existingTargetItems, existingOtherItems };
}

export function buildMoveToStatusConfirmMessage(
  items: BacklogItem[],
  targetStatus: BacklogStatus,
  subject: string,
): string | null {
  if (items.length === 0) return null;

  const labels = [...new Set(items.map((item) => statusLabels[item.status]))];
  return `${subject}はすでに「${labels.join("・")}」にあります。${statusLabels[targetStatus]}に戻しますか？`;
}

export function getSortOrderForStatusChange(
  items: BacklogItem[],
  itemId: string,
  targetStatus: BacklogStatus,
) {
  const currentItem = items.find((item) => item.id === itemId);

  if (!currentItem) {
    return getNextSortOrder(items, targetStatus);
  }

  if (currentItem.status === targetStatus) {
    return currentItem.sort_order;
  }

  return getNextSortOrder(
    items.filter((item) => item.id !== itemId),
    targetStatus,
  );
}

export type BacklogItemUpdate = Partial<
  Pick<BacklogItem, "status" | "sort_order" | "primary_platform" | "note">
>;

export function buildDetailFieldUpdate(
  field: DetailModalEditableField,
  draftValue: string,
): BacklogItemUpdate {
  if (field === "primaryPlatform") {
    return {
      primary_platform: normalizePrimaryPlatform(draftValue),
    };
  }

  return {
    note: draftValue.trim() || null,
  };
}

export function applyBacklogItemUpdate(item: BacklogItem, update: BacklogItemUpdate): BacklogItem {
  return {
    ...item,
    ...update,
  };
}

export function getSortOrderForDrop(
  items: BacklogItem[],
  itemId: string,
  targetStatus: BacklogStatus,
  targetItemId: string | null,
  side: "before" | "after",
) {
  const targetItems = items
    .filter((item) => item.id !== itemId && item.status === targetStatus)
    .sort((left, right) => left.sort_order - right.sort_order);

  if (!targetItemId) {
    return targetItems.length > 0 ? targetItems.at(-1)!.sort_order + 1000 : 1000;
  }

  const targetIndex = targetItems.findIndex((item) => item.id === targetItemId);

  if (targetIndex === -1) {
    return targetItems.length > 0 ? targetItems.at(-1)!.sort_order + 1000 : 1000;
  }

  const insertionIndex = side === "before" ? targetIndex : targetIndex + 1;
  const previous = insertionIndex > 0 ? targetItems[insertionIndex - 1] : null;
  const next = insertionIndex < targetItems.length ? targetItems[insertionIndex] : null;

  if (!previous && !next) {
    return 1000;
  }

  if (!previous && next) {
    return next.sort_order - 1000;
  }

  if (previous && !next) {
    return previous.sort_order + 1000;
  }

  return (previous!.sort_order + next!.sort_order) / 2;
}
