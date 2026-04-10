import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase.ts";
import {
  fetchTmdbWorkDetails,
  type TmdbSeasonOption,
  type TmdbSeasonSelectionTarget,
  type TmdbSearchResult,
  type TmdbSelectionTarget,
} from "../../lib/tmdb.ts";
import { fetchOmdbWorkDetails } from "../../lib/omdb.ts";
import { buildSearchText } from "./helpers.ts";
import type { WorkType } from "./types.ts";
import { buildTmdbWorkUpdate, calcBackgroundFitScore, type RatingInfo } from "./work-metadata.ts";

const TMDB_WORK_REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const OMDB_WORK_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
type TmdbWorkIdResponse = PostgrestSingleResponse<{ id: string }>;
type ExistingTmdbWorkRow = {
  id: string;
  last_tmdb_synced_at: string | null;
  omdb_fetched_at: string | null;
  imdb_id: string | null;
  genres: string[];
};
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
type OkResponseData = { id: string };

export function shouldRefreshOmdbWork(
  omdbFetchedAt: string | null,
  now = Date.now(),
  refreshIntervalMs = OMDB_WORK_REFRESH_INTERVAL_MS,
) {
  if (!omdbFetchedAt) {
    return true;
  }

  const fetchedAtMs = Date.parse(omdbFetchedAt);
  if (Number.isNaN(fetchedAtMs)) {
    return true;
  }

  return now - fetchedAtMs >= refreshIntervalMs;
}

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
    return buildErrorIdResponse(selectError);
  }

  if (existing) {
    return buildOkIdResponse(existing.id);
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
    return buildErrorIdResponse(conflictError, 409, "Conflict");
  }

  if (conflicted) {
    return buildOkIdResponse(conflicted.id);
  }
  return buildErrorIdResponse(insertResult.error!, 409, "Conflict");
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
    .select("id, last_tmdb_synced_at, omdb_fetched_at, imdb_id, genres")
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
    return buildErrorIdResponse(selectError);
  }

  const shouldRefreshTmdb = !existing || shouldRefreshTmdbWork(existing.last_tmdb_synced_at);
  const shouldRefreshOmdb = !existing || shouldRefreshOmdbWork(existing.omdb_fetched_at);
  const shouldSyncTmdbForOmdb = Boolean(existing && shouldRefreshOmdb && !existing.imdb_id);

  if (existing && !shouldRefreshTmdb && !shouldSyncTmdbForOmdb) {
    if (existing.imdb_id && shouldRefreshOmdb) {
      try {
        const omdb = await fetchOmdbWorkDetails(existing.imdb_id);
        const omdbRatings: RatingInfo = {
          imdbRating: omdb.imdbRating,
          rottenTomatoesScore: omdb.rottenTomatoesScore,
        };
        await supabase
          .from("works")
          .update({
            rotten_tomatoes_score: omdb.rottenTomatoesScore,
            imdb_rating: omdb.imdbRating,
            imdb_votes: omdb.imdbVotes,
            metacritic_score: omdb.metacriticScore,
            background_fit_score: calcBackgroundFitScore(existing.genres, omdbRatings),
            omdb_fetched_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } catch {
        // OMDb 更新の失敗は TMDb の early return をブロックしない
      }
    }
    return buildOkIdResponse(existing.id);
  }

  const details = await fetchTmdbWorkDetails(target);

  const omdbFields = await (async () => {
    const omdbFetchedAt = new Date().toISOString();

    if (details.imdbId === null) {
      if (
        existing &&
        !shouldRefreshOmdbWork(existing.omdb_fetched_at) &&
        existing.imdb_id === null
      ) {
        return {};
      }

      return {
        rotten_tomatoes_score: null,
        imdb_rating: null,
        imdb_votes: null,
        metacritic_score: null,
        omdb_fetched_at: omdbFetchedAt,
      };
    }

    if (!details.imdbId) return {};
    if (
      existing &&
      !shouldRefreshOmdbWork(existing.omdb_fetched_at) &&
      existing.imdb_id === details.imdbId
    ) {
      return {};
    }
    try {
      const omdb = await fetchOmdbWorkDetails(details.imdbId);
      return {
        rotten_tomatoes_score: omdb.rottenTomatoesScore,
        imdb_rating: omdb.imdbRating,
        imdb_votes: omdb.imdbVotes,
        metacritic_score: omdb.metacriticScore,
        omdb_fetched_at: omdbFetchedAt,
      };
    } catch {
      return {};
    }
  })();

  const omdbRatings: RatingInfo = {
    imdbRating: "imdb_rating" in omdbFields ? (omdbFields.imdb_rating ?? null) : null,
    rottenTomatoesScore:
      "rotten_tomatoes_score" in omdbFields ? (omdbFields.rotten_tomatoes_score ?? null) : null,
  };
  const updatePayload =
    options.parentWorkId === undefined
      ? {
          ...buildTmdbWorkUpdate(details),
          ...omdbFields,
          background_fit_score: calcBackgroundFitScore(details.genres, omdbRatings),
        }
      : {
          ...buildTmdbWorkUpdate(details),
          ...omdbFields,
          background_fit_score: calcBackgroundFitScore(details.genres, omdbRatings),
          parent_work_id: options.parentWorkId,
        };

  if (existing) {
    const { error: updateError } = await supabase
      .from("works")
      .update(updatePayload)
      .eq("id", existing.id);

    if (updateError) {
      return buildErrorIdResponse(updateError);
    }

    return buildOkIdResponse(existing.id);
  }

  return supabase
    .from("works")
    .insert({
      ...buildTmdbWorkInsert(details, userId, workType, options.parentWorkId ?? null),
      ...omdbFields,
    })
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

function buildErrorIdResponse(
  error: PostgrestError,
  status = 400,
  statusText = "Bad Request",
): TmdbWorkIdResponse {
  return { success: false, data: null, error, count: null, status, statusText };
}

function buildOkIdResponse(id: string): TmdbWorkIdResponse {
  const data: OkResponseData = { id };
  return { success: true, data, error: null, count: null, status: 200, statusText: "OK" };
}
