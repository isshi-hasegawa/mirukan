import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase.ts";
import {
  fetchTmdbWorkDetails,
  type TmdbSeasonOption,
  type TmdbSeasonSelectionTarget,
  type TmdbSearchResult,
  type TmdbSelectionTarget,
  type TmdbWorkDetails,
} from "../../lib/tmdb.ts";
import { statusLabels, viewingModeOrder } from "./constants.ts";
import { buildSearchText, normalizePrimaryPlatform } from "./helpers.ts";
import type {
  BacklogItem,
  BacklogItemRow,
  BacklogStatus,
  DetailModalEditableField,
  ViewingMode,
  WorkSummary,
  WorkType,
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

export function getTopSortOrder(items: BacklogItem[], status: BacklogStatus): number {
  const statusItems = items.filter((item) => item.status === status);
  if (statusItems.length === 0) return 1000;
  return Math.min(...statusItems.map((i) => i.sort_order)) - 1000;
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

type BacklogItemUpdate = Partial<
  Pick<BacklogItem, "status" | "sort_order" | "primary_platform" | "note">
>;

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

export async function upsertTmdbWork(
  target: TmdbSelectionTarget,
  userId: string,
): Promise<PostgrestSingleResponse<{ id: string }>> {
  if (target.workType === "season") {
    return upsertTmdbSeasonWork(target, userId);
  }

  const workType = target.workType as Extract<WorkType, "movie" | "series">;
  const details = await fetchTmdbWorkDetails(target);

  const { data: existing, error: selectError } = await supabase
    .from("works")
    .select("id")
    .eq("source_type", "tmdb")
    .eq("tmdb_media_type", target.tmdbMediaType)
    .eq("tmdb_id", target.tmdbId)
    .eq("work_type", workType)
    .maybeSingle();

  if (selectError) {
    return { data: null, error: selectError, count: null, status: 400, statusText: "Bad Request" };
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("works")
      .update(buildTmdbWorkUpdate(details))
      .eq("id", existing.id);

    if (updateError) {
      return {
        data: null,
        error: updateError,
        count: null,
        status: 400,
        statusText: "Bad Request",
      };
    }

    return { data: existing, error: null, count: null, status: 200, statusText: "OK" };
  }

  return supabase
    .from("works")
    .insert(buildTmdbWorkInsert(details, userId, workType))
    .select("id")
    .single();
}

export async function upsertManualWork(
  title: string,
  workType: Extract<WorkType, "movie" | "series">,
  userId: string,
): Promise<PostgrestSingleResponse<{ id: string }>> {
  const searchText = buildSearchText(title);
  const { data: existing, error: selectError } = await supabase
    .from("works")
    .select("id")
    .eq("created_by", userId)
    .eq("source_type", "manual")
    .eq("work_type", workType)
    .eq("search_text", searchText)
    .maybeSingle();

  if (selectError) {
    return { data: null, error: selectError, count: null, status: 400, statusText: "Bad Request" };
  }

  if (existing) {
    return { data: existing, error: null, count: null, status: 200, statusText: "OK" };
  }

  const insertResult = await supabase
    .from("works")
    .insert({
      created_by: userId,
      source_type: "manual",
      work_type: workType,
      title,
      search_text: searchText,
    })
    .select("id")
    .single();

  if (insertResult.error?.code !== "23505") {
    return insertResult;
  }

  const { data: conflicted, error: conflictError } = await supabase
    .from("works")
    .select("id")
    .eq("created_by", userId)
    .eq("source_type", "manual")
    .eq("work_type", workType)
    .eq("search_text", searchText)
    .maybeSingle();

  if (conflictError) {
    return {
      data: null,
      error: conflictError,
      count: null,
      status: 409,
      statusText: "Conflict",
    };
  }

  return {
    data: conflicted,
    error: conflicted ? null : insertResult.error,
    count: null,
    status: conflicted ? 200 : 409,
    statusText: conflicted ? "OK" : "Conflict",
  };
}

function buildTmdbWorkInsert(
  details: TmdbWorkDetails,
  userId: string,
  workType: WorkType,
  parentWorkId: string | null = null,
) {
  return {
    created_by: userId,
    source_type: "tmdb" as const,
    tmdb_media_type: details.tmdbMediaType,
    tmdb_id: details.tmdbId,
    work_type: workType,
    parent_work_id: parentWorkId,
    ...buildTmdbWorkUpdate(details),
  };
}

function buildTmdbWorkUpdate(details: TmdbWorkDetails) {
  return {
    title: details.title,
    original_title: details.originalTitle,
    search_text: buildSearchText(
      [details.title, details.originalTitle, ...details.genres].filter(Boolean).join(" "),
    ),
    overview: details.overview,
    poster_path: details.posterPath,
    release_date: details.releaseDate,
    runtime_minutes: details.runtimeMinutes,
    typical_episode_runtime_minutes: details.typicalEpisodeRuntimeMinutes,
    duration_bucket: getDurationBucket(
      details.runtimeMinutes ?? details.typicalEpisodeRuntimeMinutes,
    ),
    episode_count: details.episodeCount,
    season_count: details.seasonCount,
    season_number: details.seasonNumber,
    genres: details.genres,
    focus_required_score: calcFocusRequiredScore(details.genres),
    background_fit_score: calcBackgroundFitScore(details.genres),
    completion_load_score: calcCompletionLoadScore(details),
  };
}

const FOCUS_HIGH_GENRES = new Set([
  "スリラー",
  "ミステリー",
  "ホラー",
  "戦争",
  "戦争&政治",
  "歴史",
  "ドキュメンタリー",
]);
const FOCUS_LOW_GENRES = new Set([
  "コメディ",
  "ロマンス",
  "ファミリー",
  "アニメーション",
  "キッズ",
  "音楽",
  "リアリティ",
  "ソープ",
  "トーク",
]);

function calcFocusRequiredScore(genres: string[]): number {
  if (genres.some((g) => FOCUS_HIGH_GENRES.has(g))) return 75;
  if (genres.some((g) => FOCUS_LOW_GENRES.has(g))) return 25;
  return 50;
}

const BG_HIGH_GENRES = new Set([
  "コメディ",
  "アニメーション",
  "ファミリー",
  "キッズ",
  "音楽",
  "リアリティ",
  "トーク",
  "ソープ",
]);
const BG_MED_GENRES = new Set([
  "アクション",
  "アドベンチャー",
  "アクション&アドベンチャー",
  "ロマンス",
  "SF&ファンタジー",
  "西部劇",
]);
const BG_LOW_GENRES = new Set([
  "スリラー",
  "ミステリー",
  "ホラー",
  "戦争",
  "戦争&政治",
  "歴史",
  "ドキュメンタリー",
]);

function calcBackgroundFitScore(genres: string[]): number {
  if (genres.some((g) => BG_LOW_GENRES.has(g))) return 0;
  if (genres.some((g) => BG_HIGH_GENRES.has(g))) return 75;
  if (genres.some((g) => BG_MED_GENRES.has(g))) return 50;
  return 25;
}

export function calcCompletionLoadScore(details: TmdbWorkDetails): number {
  // movie は作品全体、series/season は1話がキリのいい単位
  const minutes =
    details.workType === "movie" ? details.runtimeMinutes : details.typicalEpisodeRuntimeMinutes;

  const bucket = getDurationBucket(minutes);
  if (bucket === "short") return 0;
  if (bucket === "medium") return 25;
  if (bucket === "long") return 50;
  if (bucket === "very_long") return 75;
  return 50;
}

async function upsertTmdbSeasonWork(
  target: TmdbSeasonSelectionTarget,
  userId: string,
): Promise<PostgrestSingleResponse<{ id: string }>> {
  // S1 はシリーズとして保存（series = S1 を兼ねる）
  if (target.seasonNumber === 1) {
    const seriesTarget: TmdbSearchResult = {
      tmdbId: target.tmdbId,
      tmdbMediaType: "tv",
      workType: "series",
      title: target.seriesTitle,
      originalTitle: target.originalTitle,
      overview: target.overview,
      posterPath: target.posterPath,
      releaseDate: target.releaseDate,
    };
    return upsertTmdbWork(seriesTarget, userId);
  }

  const seriesTarget: TmdbSearchResult = {
    tmdbId: target.tmdbId,
    tmdbMediaType: "tv",
    workType: "series",
    title: target.seriesTitle,
    originalTitle: target.originalTitle,
    overview: target.overview,
    posterPath: target.posterPath,
    releaseDate: target.releaseDate,
  };
  const seriesResult = await upsertTmdbWork(seriesTarget, userId);

  if (seriesResult.error || !seriesResult.data) {
    return seriesResult as PostgrestSingleResponse<{ id: string }>;
  }

  const details = await fetchTmdbWorkDetails(target);
  const { data: existing, error: selectError } = await supabase
    .from("works")
    .select("id")
    .eq("source_type", "tmdb")
    .eq("tmdb_media_type", "tv")
    .eq("tmdb_id", target.tmdbId)
    .eq("work_type", "season")
    .eq("season_number", target.seasonNumber)
    .maybeSingle();

  if (selectError) {
    return { data: null, error: selectError, count: null, status: 400, statusText: "Bad Request" };
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from("works")
      .update({
        ...buildTmdbWorkUpdate(details),
        parent_work_id: seriesResult.data.id,
      })
      .eq("id", existing.id);

    if (updateError) {
      return {
        data: null,
        error: updateError,
        count: null,
        status: 400,
        statusText: "Bad Request",
      };
    }

    return { data: existing, error: null, count: null, status: 200, statusText: "OK" };
  }

  return supabase
    .from("works")
    .insert(buildTmdbWorkInsert(details, userId, "season", seriesResult.data.id))
    .select("id")
    .single();
}

export function buildSelectedSeasonTargets(
  seriesResult: TmdbSearchResult,
  seasonOptions: TmdbSeasonOption[],
  seasonNumbers: number[],
): TmdbSelectionTarget[] {
  const normalizedSeasonNumbers = [...new Set(seasonNumbers)].sort((left, right) => left - right);
  const seasonOptionsByNumber = new Map(
    seasonOptions.map((season) => [season.seasonNumber, season] as const),
  );

  return normalizedSeasonNumbers.map((seasonNumber) => {
    if (seasonNumber === 1) {
      return seriesResult;
    }

    const season = seasonOptionsByNumber.get(seasonNumber);
    if (!season) {
      throw new Error(`シーズン${seasonNumber}の情報が見つかりません`);
    }

    return {
      tmdbId: seriesResult.tmdbId,
      tmdbMediaType: "tv",
      workType: "season",
      title: season.title,
      originalTitle: seriesResult.originalTitle,
      overview: season.overview,
      posterPath: season.posterPath,
      releaseDate: season.releaseDate,
      seasonNumber,
      episodeCount: season.episodeCount,
      seriesTitle: seriesResult.title,
    };
  });
}

type ResolveSelectedSeasonWorkIdsOptions = {
  seasonOptions: TmdbSeasonOption[];
};

export async function resolveSelectedSeasonWorkIds(
  seriesResult: TmdbSearchResult,
  userId: string,
  seasonNumbers: number[],
  options: ResolveSelectedSeasonWorkIdsOptions,
): Promise<{ error: string | null; workIds: string[] }> {
  if (seasonNumbers.length === 0) {
    return { error: "追加するシーズンを1つ以上選択してください", workIds: [] };
  }

  let targets: TmdbSelectionTarget[] = [];
  try {
    targets = buildSelectedSeasonTargets(seriesResult, options.seasonOptions, seasonNumbers);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "シーズン情報の組み立てに失敗しました",
      workIds: [],
    };
  }

  const workIds: string[] = [];
  for (const target of targets) {
    const seasonWork = await upsertTmdbWork(target, userId);
    if (seasonWork.error || !seasonWork.data) {
      const label = target.workType === "season" ? `シーズン${target.seasonNumber}` : "シーズン1";
      return {
        error: seasonWork.error?.message ?? `${label}の保存に失敗しました`,
        workIds: [],
      };
    }
    workIds.push(seasonWork.data.id);
  }

  return { error: null, workIds };
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

export function getViewingMode(work: WorkSummary): ViewingMode | null {
  return viewingModeOrder.find((mode) => applyModeFilter(work, mode)) ?? null;
}

export function sortStackedItemsByViewingMode(
  items: BacklogItem[],
  activeMode: ViewingMode | null,
): BacklogItem[] {
  if (!activeMode) {
    return items;
  }

  const prioritized: BacklogItem[] = [];
  const rest: BacklogItem[] = [];

  for (const item of items) {
    if (item.works && getViewingMode(item.works) === activeMode) {
      prioritized.push(item);
    } else {
      rest.push(item);
    }
  }

  return [...prioritized, ...rest];
}

export function applyModeFilter(work: WorkSummary, mode: ViewingMode): boolean {
  if (mode === "background") {
    return work.background_fit_score !== null && work.background_fit_score >= 50;
  }

  const duration =
    work.work_type === "movie" ? work.runtime_minutes : work.typical_episode_runtime_minutes;

  if (duration === null) return false;
  if (mode === "focus" && duration < 80) return false;
  if (mode === "thoughtful" && (duration < 40 || duration >= 80)) return false;
  if (mode === "quick" && duration >= 40) return false;

  return true;
}

function getDurationBucket(minutes: number | null) {
  if (minutes === null) {
    return null;
  }

  if (minutes <= 30) {
    return "short" as const;
  }

  if (minutes <= 70) {
    return "medium" as const;
  }

  if (minutes <= 120) {
    return "long" as const;
  }

  return "very_long" as const;
}
