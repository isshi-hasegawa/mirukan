import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase.ts";
import {
  fetchTmdbWorkDetails,
  type TmdbSeasonOption,
  type TmdbSeasonSelectionTarget,
  type TmdbSearchResult,
  type TmdbSelectionTarget,
} from "../../lib/tmdb.ts";
import { buildSearchText } from "./helpers.ts";
import type { WorkType } from "./types.ts";
import { buildTmdbWorkUpdate } from "./work-metadata.ts";

const TMDB_WORK_REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
type TmdbWorkIdResponse = PostgrestSingleResponse<{ id: string }>;
type ExistingTmdbWorkRow = { id: string; last_tmdb_synced_at: string | null };
type TmdbWorkLookup = {
  tmdbMediaType: "movie" | "tv";
  tmdbId: number;
  workType: WorkType;
  seasonNumber?: number;
};
type UpsertFetchedTmdbWorkOptions = {
  parentWorkId?: string;
  seasonNumber?: number;
  workType?: WorkType;
};

export function shouldRefreshTmdbWork(
  lastSyncedAt: string | null,
  now = Date.now(),
  refreshIntervalMs = TMDB_WORK_REFRESH_INTERVAL_MS,
) {
  if (!lastSyncedAt) {
    return true;
  }

  const syncedAtMs = Date.parse(lastSyncedAt);
  if (Number.isNaN(syncedAtMs)) {
    return true;
  }

  return now - syncedAtMs >= refreshIntervalMs;
}

export async function upsertTmdbWork(
  target: TmdbSelectionTarget,
  userId: string,
): Promise<TmdbWorkIdResponse> {
  if (target.workType === "season") {
    return upsertTmdbSeasonWork(target, userId);
  }

  return upsertFetchedTmdbWork(target, userId);
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

  if (conflicted) {
    return { data: { id: conflicted.id }, error: null, count: null, status: 200, statusText: "OK" };
  }
  return {
    data: null,
    error: insertResult.error!,
    count: null,
    status: 409,
    statusText: "Conflict",
  };
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

function buildTmdbWorkInsert(
  details: Parameters<typeof buildTmdbWorkUpdate>[0],
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

async function upsertTmdbSeasonWork(
  target: TmdbSeasonSelectionTarget,
  userId: string,
): Promise<TmdbWorkIdResponse> {
  const seriesTarget = buildTmdbSeriesTarget(target);

  if (target.seasonNumber === 1) {
    return upsertTmdbWork(seriesTarget, userId);
  }

  const seriesResult = await upsertTmdbWork(seriesTarget, userId);

  if (seriesResult.error || !seriesResult.data) {
    return seriesResult;
  }

  return upsertFetchedTmdbWork(target, userId, {
    parentWorkId: seriesResult.data.id,
  });
}

async function findExistingTmdbWork({
  tmdbMediaType,
  tmdbId,
  workType,
  seasonNumber,
}: TmdbWorkLookup): Promise<{ data: ExistingTmdbWorkRow | null; error: PostgrestError | null }> {
  let query = supabase
    .from("works")
    .select("id, last_tmdb_synced_at")
    .eq("source_type", "tmdb")
    .eq("tmdb_media_type", tmdbMediaType)
    .eq("tmdb_id", tmdbId)
    .eq("work_type", workType);

  if (seasonNumber !== undefined) {
    query = query.eq("season_number", seasonNumber);
  }

  return query.maybeSingle();
}

async function upsertFetchedTmdbWork(
  target: TmdbSelectionTarget,
  userId: string,
  options: UpsertFetchedTmdbWorkOptions = {},
): Promise<TmdbWorkIdResponse> {
  const workType = options.workType ?? target.workType;
  const seasonNumber =
    options.seasonNumber ?? (target.workType === "season" ? target.seasonNumber : undefined);
  const { data: existing, error: selectError } = await findExistingTmdbWork({
    tmdbMediaType: target.tmdbMediaType,
    tmdbId: target.tmdbId,
    workType,
    seasonNumber,
  });

  if (selectError) {
    return buildBadRequestResponse(selectError);
  }

  if (existing && !shouldRefreshTmdbWork(existing.last_tmdb_synced_at)) {
    return buildOkIdResponse(existing.id);
  }

  const details = await fetchTmdbWorkDetails(target);
  const updatePayload =
    options.parentWorkId === undefined
      ? buildTmdbWorkUpdate(details)
      : {
          ...buildTmdbWorkUpdate(details),
          parent_work_id: options.parentWorkId,
        };

  if (existing) {
    const { error: updateError } = await supabase
      .from("works")
      .update(updatePayload)
      .eq("id", existing.id);

    if (updateError) {
      return buildBadRequestResponse(updateError);
    }

    return buildOkIdResponse(existing.id);
  }

  return supabase
    .from("works")
    .insert(buildTmdbWorkInsert(details, userId, workType, options.parentWorkId ?? null))
    .select("id")
    .single();
}

function buildTmdbSeriesTarget(target: TmdbSeasonSelectionTarget): TmdbSearchResult {
  return {
    tmdbId: target.tmdbId,
    tmdbMediaType: "tv",
    workType: "series",
    title: target.seriesTitle,
    originalTitle: target.originalTitle,
    overview: target.overview,
    posterPath: target.posterPath,
    releaseDate: target.releaseDate,
    jpWatchPlatforms: [],
    hasJapaneseRelease: false,
  };
}

function buildBadRequestResponse(error: PostgrestError): TmdbWorkIdResponse {
  return { data: null, error, count: null, status: 400, statusText: "Bad Request" };
}

function buildOkIdResponse(id: string): TmdbWorkIdResponse {
  return { data: { id }, error: null, count: null, status: 200, statusText: "OK" };
}
