import { fetchOmdbDetails, type OmdbWorkDetails } from "../omdb.ts";
import { readTmdbMetadataCache, writeTmdbMetadataCache } from "./cache.ts";
import { fetchTmdbJson, mapWithConcurrency } from "./http.ts";
import {
  MAX_OMDB_ENRICH_RESULTS,
  OMDB_ENRICH_CONCURRENCY,
  type TmdbExternalIdsResponse,
  type TmdbMediaType,
  type TmdbSearchResult,
} from "./types.ts";

function buildOmdbCacheKey(tmdbId: number, mediaType: TmdbMediaType) {
  return `omdb-by-tmdb:${mediaType}:${tmdbId}`;
}

function normalizeCachedOmdbWorkDetails(payload: unknown): OmdbWorkDetails | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;

  return {
    rottenTomatoesScore:
      typeof record.rottenTomatoesScore === "number" || record.rottenTomatoesScore === null
        ? record.rottenTomatoesScore
        : null,
    imdbRating:
      typeof record.imdbRating === "number" || record.imdbRating === null
        ? record.imdbRating
        : null,
    imdbVotes:
      typeof record.imdbVotes === "number" || record.imdbVotes === null ? record.imdbVotes : null,
    metacriticScore:
      typeof record.metacriticScore === "number" || record.metacriticScore === null
        ? record.metacriticScore
        : null,
  };
}

type ImdbIdLookupResult =
  | { kind: "found"; imdbId: string }
  | { kind: "missing" }
  | { kind: "unavailable" };

export function classifyImdbIdLookupResult(imdbId: string | null | undefined): ImdbIdLookupResult {
  if (typeof imdbId === "string" && imdbId.trim() !== "") {
    return { kind: "found", imdbId };
  }

  if (imdbId === null) {
    return { kind: "missing" };
  }

  return { kind: "unavailable" };
}

export async function fetchImdbId(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<string | null | undefined> {
  try {
    const json = await fetchTmdbJson<TmdbExternalIdsResponse>(
      `/${mediaType}/${tmdbId}/external_ids`,
      {},
    );
    return json.imdb_id ?? null;
  } catch {
    return undefined;
  }
}

async function fetchOmdbDetailsByTmdbId(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<OmdbWorkDetails | null> {
  const cacheKey = buildOmdbCacheKey(tmdbId, mediaType);
  const cached = await readTmdbMetadataCache(cacheKey).catch(() => null);
  const cachedValue = normalizeCachedOmdbWorkDetails(cached?.payload);

  if (cached?.fresh && cachedValue) {
    return cachedValue;
  }

  try {
    const imdbLookup = classifyImdbIdLookupResult(await fetchImdbId(tmdbId, mediaType));
    if (imdbLookup.kind === "unavailable") {
      return cachedValue;
    }

    if (imdbLookup.kind === "missing") {
      const emptyResult = {
        rottenTomatoesScore: null,
        imdbRating: null,
        imdbVotes: null,
        metacriticScore: null,
      };
      await writeTmdbMetadataCache(cacheKey, emptyResult).catch(() => undefined);
      return emptyResult;
    }

    const fresh = await fetchOmdbDetails(imdbLookup.imdbId);
    await writeTmdbMetadataCache(cacheKey, fresh).catch(() => undefined);
    return fresh;
  } catch {
    return cachedValue;
  }
}

export async function enrichWithCachedOmdbScores(
  results: TmdbSearchResult[],
): Promise<TmdbSearchResult[]> {
  const targets = results.slice(0, MAX_OMDB_ENRICH_RESULTS);
  const enrichedTargets = await mapWithConcurrency(
    targets,
    OMDB_ENRICH_CONCURRENCY,
    async (result) => {
      const omdb = await fetchOmdbDetailsByTmdbId(result.tmdbId, result.tmdbMediaType);
      return {
        ...result,
        rottenTomatoesScore: omdb?.rottenTomatoesScore ?? null,
      };
    },
  );

  return results.map((result, index) => enrichedTargets[index] ?? result);
}
