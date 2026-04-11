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
import {
  buildErrorIdResponse,
  buildOkIdResponse,
  buildSelectedSeasonTargets,
  buildTmdbSeriesTarget,
  buildTmdbWorkInsert,
  shouldRefreshOmdbWork,
  shouldRefreshTmdbWork,
  type TmdbWorkIdResponse,
} from "./work-repository-helpers.ts";
export {
  buildSelectedSeasonTargets,
  shouldRefreshOmdbWork,
  shouldRefreshTmdbWork,
} from "./work-repository-helpers.ts";

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
  return buildErrorIdResponse(insertResult.error, 409, "Conflict");
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
  const lookup = buildTmdbWorkLookup(target, options);
  const { data: existing, error: selectError } = await findExistingTmdbWork(lookup);

  if (selectError) {
    return buildErrorIdResponse(selectError);
  }

  const syncState = buildTmdbSyncState(existing);
  if (existing && !syncState.shouldRefreshTmdb && !syncState.shouldSyncTmdbForOmdb) {
    await refreshExistingOmdbFields(existing, syncState.shouldRefreshOmdb);
    return buildOkIdResponse(existing.id);
  }

  const details = await fetchTmdbWorkDetails(target);
  const omdbFields = await buildOmdbFields(details, existing);
  const omdbRatings = buildOmdbRatings(omdbFields);
  const updatePayload = buildTmdbUpdatePayload(details, omdbFields, options.parentWorkId);

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
      ...buildTmdbWorkInsert(details, userId, lookup.workType, options.parentWorkId ?? null),
      ...omdbFields,
      background_fit_score: calcBackgroundFitScore(details.genres, omdbRatings),
    })
    .select("id")
    .single();
}

function buildTmdbWorkLookup(
  target: TmdbSelectionTarget,
  options: UpsertFetchedTmdbWorkOptions,
): TmdbWorkLookup {
  return {
    tmdbMediaType: target.tmdbMediaType,
    tmdbId: target.tmdbId,
    workType: options.workType ?? target.workType,
    seasonNumber:
      options.seasonNumber ?? (target.workType === "season" ? target.seasonNumber : undefined),
  };
}

function buildTmdbSyncState(existing: ExistingTmdbWorkRow | null) {
  const shouldRefreshTmdb = !existing || shouldRefreshTmdbWork(existing.last_tmdb_synced_at);
  const shouldRefreshOmdb = !existing || shouldRefreshOmdbWork(existing.omdb_fetched_at);

  return {
    shouldRefreshTmdb,
    shouldRefreshOmdb,
    shouldSyncTmdbForOmdb: Boolean(existing && shouldRefreshOmdb && !existing.imdb_id),
  };
}

async function refreshExistingOmdbFields(
  existing: ExistingTmdbWorkRow,
  shouldRefreshOmdb: boolean,
) {
  if (!existing.imdb_id || !shouldRefreshOmdb) {
    return;
  }

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

type OmdbFields = {
  rotten_tomatoes_score?: number | null;
  imdb_rating?: number | null;
  imdb_votes?: number | null;
  metacritic_score?: number | null;
  omdb_fetched_at?: string;
};

async function buildOmdbFields(
  details: Awaited<ReturnType<typeof fetchTmdbWorkDetails>>,
  existing: ExistingTmdbWorkRow | null,
): Promise<OmdbFields> {
  const omdbFetchedAt = new Date().toISOString();

  if (details.imdbId === null) {
    return shouldKeepExistingNullOmdbState(existing)
      ? {}
      : {
          rotten_tomatoes_score: null,
          imdb_rating: null,
          imdb_votes: null,
          metacritic_score: null,
          omdb_fetched_at: omdbFetchedAt,
        };
  }

  if (!details.imdbId || shouldSkipOmdbRefresh(existing, details.imdbId)) {
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
}

function shouldKeepExistingNullOmdbState(existing: ExistingTmdbWorkRow | null) {
  return Boolean(
    existing && !shouldRefreshOmdbWork(existing.omdb_fetched_at) && existing.imdb_id === null,
  );
}

function shouldSkipOmdbRefresh(existing: ExistingTmdbWorkRow | null, imdbId: string) {
  return Boolean(
    existing && !shouldRefreshOmdbWork(existing.omdb_fetched_at) && existing.imdb_id === imdbId,
  );
}

function buildOmdbRatings(omdbFields: OmdbFields): RatingInfo {
  return {
    imdbRating: "imdb_rating" in omdbFields ? (omdbFields.imdb_rating ?? null) : null,
    rottenTomatoesScore:
      "rotten_tomatoes_score" in omdbFields ? (omdbFields.rotten_tomatoes_score ?? null) : null,
  };
}

function buildTmdbUpdatePayload(
  details: Awaited<ReturnType<typeof fetchTmdbWorkDetails>>,
  omdbFields: OmdbFields,
  parentWorkId: string | undefined,
) {
  const omdbRatings = buildOmdbRatings(omdbFields);
  return {
    ...buildTmdbWorkUpdate(details),
    ...omdbFields,
    background_fit_score: calcBackgroundFitScore(details.genres, omdbRatings),
    ...(parentWorkId === undefined ? {} : { parent_work_id: parentWorkId }),
  };
}
