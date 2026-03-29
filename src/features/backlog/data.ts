import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase.ts";
import {
  fetchTmdbSeasonOptions,
  fetchTmdbWorkDetails,
  type TmdbSeasonSelectionTarget,
  type TmdbSearchResult,
  type TmdbSelectionTarget,
  type TmdbWorkDetails,
} from "../../lib/tmdb.ts";
import { buildSearchText } from "./helpers.ts";
import type { BacklogItem, BacklogItemRow, BacklogStatus, WorkSummary, WorkType } from "./types.ts";

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

export async function addAllSeasons(
  seriesResult: TmdbSearchResult,
  userId: string,
  status: BacklogStatus,
  existingItems: BacklogItem[],
): Promise<{ error: string | null }> {
  // シリーズ(=S1)を upsert
  const seriesWork = await upsertTmdbWork(seriesResult, userId);
  if (seriesWork.error || !seriesWork.data) {
    return { error: seriesWork.error?.message ?? "シリーズの保存に失敗しました" };
  }

  const workIds = [seriesWork.data.id];

  // S2 以降のシーズンを取得・upsert
  const seasonOptions = await fetchTmdbSeasonOptions(seriesResult);
  for (const season of seasonOptions) {
    const target: TmdbSeasonSelectionTarget = {
      tmdbId: seriesResult.tmdbId,
      tmdbMediaType: "tv",
      workType: "season",
      title: season.title,
      originalTitle: seriesResult.originalTitle,
      overview: season.overview,
      posterPath: season.posterPath,
      releaseDate: season.releaseDate,
      seasonNumber: season.seasonNumber,
      episodeCount: season.episodeCount,
      seriesTitle: seriesResult.title,
    };
    const seasonWork = await upsertTmdbSeasonWork(target, userId);
    if (seasonWork.error || !seasonWork.data) {
      return {
        error: seasonWork.error?.message ?? `シーズン${season.seasonNumber}の保存に失敗しました`,
      };
    }
    workIds.push(seasonWork.data.id);
  }

  // 既存の backlog_items に含まれる work_id は除外
  const existingWorkIds = new Set(existingItems.map((item) => item.works?.id).filter(Boolean));
  const newWorkIds = workIds.filter((id) => !existingWorkIds.has(id));

  if (newWorkIds.length === 0) {
    return { error: null };
  }

  let sortOrder = getNextSortOrder(existingItems, status);
  const rows = newWorkIds.map((workId) => {
    const row = {
      user_id: userId,
      work_id: workId,
      status,
      sort_order: sortOrder,
    };
    sortOrder += 1000;
    return row;
  });

  const { error: insertError } = await supabase.from("backlog_items").insert(rows);
  if (insertError) {
    return { error: insertError.message };
  }

  return { error: null };
}

export type ViewingMode = "focus" | "thoughtful" | "quick" | "background";

const VIEWING_MODE_ORDER: ViewingMode[] = ["focus", "thoughtful", "quick", "background"];

export function getViewingMode(work: WorkSummary): ViewingMode | null {
  return VIEWING_MODE_ORDER.find((mode) => applyModeFilter(work, mode)) ?? null;
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
