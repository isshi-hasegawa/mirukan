import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase.ts";
import {
  fetchTmdbWorkDetails,
  type TmdbSeasonSelectionTarget,
  type TmdbSearchResult,
  type TmdbSelectionTarget,
  type TmdbWorkDetails,
} from "../../lib/tmdb.ts";
import { buildSearchText } from "./helpers.ts";
import type { BacklogItem, BacklogItemRow, BacklogStatus, WorkType } from "./types.ts";

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
