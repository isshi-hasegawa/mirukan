import { fetchOmdbWorkDetails } from "../../lib/omdb.ts";
import type { RatingInfo } from "./work-metadata.ts";
import { shouldRefreshOmdbWork } from "./work-repository-helpers.ts";

export type ExistingTmdbWorkRow = {
  id: string;
  last_tmdb_synced_at: string | null;
  omdb_fetched_at: string | null;
  imdb_id: string | null;
  genres: string[];
};

export type OmdbFields = {
  rotten_tomatoes_score?: number | null;
  imdb_rating?: number | null;
  imdb_votes?: number | null;
  metacritic_score?: number | null;
  omdb_fetched_at?: string;
};

type OmdbDetails = Awaited<ReturnType<typeof fetchOmdbWorkDetails>>;

type OmdbDecision =
  | { type: "skip" }
  | { type: "clear"; omdbFetchedAt: string }
  | { type: "fetch"; imdbId: string; omdbFetchedAt: string };

function buildClearedOmdbFields(omdbFetchedAt: string): OmdbFields {
  return {
    rotten_tomatoes_score: null,
    imdb_rating: null,
    imdb_votes: null,
    metacritic_score: null,
    omdb_fetched_at: omdbFetchedAt,
  };
}

function toOmdbFields(omdb: OmdbDetails, omdbFetchedAt: string): OmdbFields {
  return {
    rotten_tomatoes_score: omdb.rottenTomatoesScore,
    imdb_rating: omdb.imdbRating,
    imdb_votes: omdb.imdbVotes,
    metacritic_score: omdb.metacriticScore,
    omdb_fetched_at: omdbFetchedAt,
  };
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

function buildOmdbDecision(
  existing: ExistingTmdbWorkRow | null,
  imdbId: string | null | undefined,
): OmdbDecision {
  const omdbFetchedAt = new Date().toISOString();

  if (imdbId === null) {
    return shouldKeepExistingNullOmdbState(existing)
      ? { type: "skip" }
      : { type: "clear", omdbFetchedAt };
  }

  if (!imdbId || shouldSkipOmdbRefresh(existing, imdbId)) {
    return { type: "skip" };
  }

  return { type: "fetch", imdbId, omdbFetchedAt };
}

export async function buildOmdbFields(
  imdbId: string | null | undefined,
  existing: ExistingTmdbWorkRow | null,
): Promise<OmdbFields> {
  const decision = buildOmdbDecision(existing, imdbId);

  switch (decision.type) {
    case "skip":
      return {};
    case "clear":
      return buildClearedOmdbFields(decision.omdbFetchedAt);
    case "fetch":
      try {
        const omdb = await fetchOmdbWorkDetails(decision.imdbId);
        return toOmdbFields(omdb, decision.omdbFetchedAt);
      } catch {
        return {};
      }
  }
}

export function buildOmdbRatings(omdbFields: OmdbFields): RatingInfo {
  return {
    imdbRating: "imdb_rating" in omdbFields ? (omdbFields.imdb_rating ?? null) : null,
    rottenTomatoesScore:
      "rotten_tomatoes_score" in omdbFields ? (omdbFields.rotten_tomatoes_score ?? null) : null,
  };
}
