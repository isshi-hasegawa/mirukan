import { statusLabels } from "./constants.ts";
import { isPrimaryPlatform, normalizePrimaryPlatform } from "./helpers.ts";
import type { BacklogItem, BacklogStatus, DetailModalEditableField, WorkSummary } from "./types.ts";

export function normalizeBacklogItems(rows: unknown[]): BacklogItem[] {
  return rows.flatMap((row) => {
    const item = normalizeBacklogItem(row);

    if (!item) {
      return [];
    }

    return [item];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === "number" || value === null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isBacklogStatus(value: unknown): value is BacklogStatus {
  return typeof value === "string" && value in statusLabels;
}

function isWorkType(value: unknown): value is WorkSummary["work_type"] {
  return value === "movie" || value === "series" || value === "season";
}

function isSourceType(value: unknown): value is WorkSummary["source_type"] {
  return value === "tmdb" || value === "manual";
}

function isTmdbMediaType(value: unknown): value is WorkSummary["tmdb_media_type"] {
  return value === "movie" || value === "tv" || value === null;
}

function isDurationBucket(value: unknown): value is WorkSummary["duration_bucket"] {
  return (
    value === "short" ||
    value === "medium" ||
    value === "long" ||
    value === "very_long" ||
    value === null
  );
}

function isBacklogWork(value: unknown): value is NonNullable<BacklogItem["works"]> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isWorkType(value.work_type) &&
    isSourceType(value.source_type) &&
    isNullableNumber(value.tmdb_id) &&
    isTmdbMediaType(value.tmdb_media_type) &&
    isNullableString(value.original_title) &&
    isNullableString(value.overview) &&
    isNullableString(value.poster_path) &&
    isNullableString(value.release_date) &&
    isNullableNumber(value.runtime_minutes) &&
    isNullableNumber(value.typical_episode_runtime_minutes) &&
    isDurationBucket(value.duration_bucket) &&
    isStringArray(value.genres) &&
    isNullableNumber(value.season_count) &&
    isNullableNumber(value.season_number) &&
    isNullableNumber(value.focus_required_score) &&
    isNullableNumber(value.background_fit_score) &&
    isNullableNumber(value.completion_load_score)
  );
}

function normalizeBacklogWork(value: unknown): BacklogItem["works"] {
  if (Array.isArray(value)) {
    return isBacklogWork(value[0]) ? value[0] : null;
  }

  return isBacklogWork(value) ? value : null;
}

function normalizeBacklogItem(value: unknown): BacklogItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isBacklogStatus(value.status) ||
    !(value.display_title === undefined || isNullableString(value.display_title)) ||
    !isPrimaryPlatform(value.primary_platform) ||
    !isNullableString(value.note) ||
    typeof value.sort_order !== "number"
  ) {
    return null;
  }

  const works = normalizeBacklogWork(value.works);
  if (!works) {
    return null;
  }

  return {
    id: value.id,
    status: value.status,
    display_title:
      typeof value.display_title === "string" ? value.display_title.trim() || null : null,
    primary_platform: value.primary_platform,
    note: value.note,
    sort_order: value.sort_order,
    works,
  };
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

function appendSortOrder(targetItems: BacklogItem[]) {
  return targetItems.length > 0 ? targetItems.at(-1)!.sort_order + 1000 : 1000;
}

function interpolateSortOrder(previous: BacklogItem | null, next: BacklogItem | null) {
  if (previous && next) {
    return (previous.sort_order + next.sort_order) / 2;
  }
  if (previous) {
    return previous.sort_order + 1000;
  }
  if (next) {
    return next.sort_order - 1000;
  }
  return 1000;
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
    return appendSortOrder(targetItems);
  }

  const targetIndex = targetItems.findIndex((item) => item.id === targetItemId);
  if (targetIndex === -1) {
    return appendSortOrder(targetItems);
  }

  const insertionIndex = side === "before" ? targetIndex : targetIndex + 1;
  const previous = insertionIndex > 0 ? targetItems[insertionIndex - 1] : null;
  const next = insertionIndex < targetItems.length ? targetItems[insertionIndex] : null;

  return interpolateSortOrder(previous, next);
}
