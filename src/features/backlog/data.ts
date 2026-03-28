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
  };
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
