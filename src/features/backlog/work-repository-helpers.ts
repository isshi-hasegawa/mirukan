import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import type {
  TmdbSeasonOption,
  TmdbSeasonSelectionTarget,
  TmdbSearchResult,
  TmdbSelectionTarget,
} from "../../lib/tmdb.ts";
import type { WorkType } from "./types.ts";
import { buildTmdbWorkUpdate } from "./work-metadata.ts";

const TMDB_WORK_REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
const OMDB_WORK_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

type OkResponseData = { id: string };

export type TmdbWorkIdResponse = PostgrestSingleResponse<{ id: string }>;

export function shouldRefreshOmdbWork(
  omdbFetchedAt: string | null,
  now = Date.now(),
  refreshIntervalMs = OMDB_WORK_REFRESH_INTERVAL_MS,
) {
  return shouldRefreshTimestamp(omdbFetchedAt, now, refreshIntervalMs);
}

export function shouldRefreshTmdbWork(
  lastSyncedAt: string | null,
  now = Date.now(),
  refreshIntervalMs = TMDB_WORK_REFRESH_INTERVAL_MS,
) {
  return shouldRefreshTimestamp(lastSyncedAt, now, refreshIntervalMs);
}

function shouldRefreshTimestamp(timestamp: string | null, now: number, refreshIntervalMs: number) {
  if (!timestamp) {
    return true;
  }

  const parsedTimestamp = Date.parse(timestamp);
  if (Number.isNaN(parsedTimestamp)) {
    return true;
  }

  return now - parsedTimestamp >= refreshIntervalMs;
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

export function buildTmdbSeriesTarget(target: TmdbSeasonSelectionTarget): TmdbSearchResult {
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

export function buildTmdbWorkInsert(
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

export function buildErrorIdResponse(
  error: PostgrestError,
  status = 400,
  statusText = "Bad Request",
): TmdbWorkIdResponse {
  return { success: false, data: null, error, count: null, status, statusText };
}

export function buildOkIdResponse(id: string): TmdbWorkIdResponse {
  const data: OkResponseData = { id };
  return { success: true, data, error: null, count: null, status: 200, statusText: "OK" };
}
