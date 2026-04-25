import type { TmdbSearchResult } from "./tmdb.ts";
import { getSecureRandomInt } from "./random.ts";

const RECOMMENDATIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type RecommendationCacheEntry = {
  results: TmdbSearchResult[];
  fetchedAt: number;
};

type RecommendationSourceItem = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
};

let trendingCache: RecommendationCacheEntry | null = null;
let trendingCachePromise: Promise<TmdbSearchResult[]> | null = null;
const similarCache = new Map<string, RecommendationCacheEntry>();
const similarCachePromises = new Map<string, Promise<TmdbSearchResult[]>>();

export function normalizeRecommendationSources(sourceItems: RecommendationSourceItem[]) {
  const seen = new Set<string>();
  const uniqueItems: RecommendationSourceItem[] = [];

  for (const item of sourceItems) {
    const key = buildRecommendationKey(item);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueItems.push(item);
  }

  return uniqueItems.slice(0, 8);
}

export async function fetchCachedSimilarResults(
  sourceItems: RecommendationSourceItem[],
  load: () => Promise<TmdbSearchResult[]>,
) {
  const cacheKey = buildRecommendationSourceCacheKey(sourceItems);
  return readCachedCollection({
    cacheKey,
    entries: similarCache,
    inFlight: similarCachePromises,
    load,
  });
}

export async function fetchCachedTrendingResults(load: () => Promise<TmdbSearchResult[]>) {
  if (hasFreshEntry(trendingCache)) {
    return shuffleResults(trendingCache.results);
  }

  if (trendingCachePromise) {
    return shuffleResults(await trendingCachePromise);
  }

  const request = loadAndPersist(load, (results) => {
    trendingCache = { results, fetchedAt: Date.now() };
  });
  trendingCachePromise = request.finally(() => {
    trendingCachePromise = null;
  });

  return shuffleResults(await request);
}

export function mergeRecommendationResults(
  primary: TmdbSearchResult[],
  fallback: TmdbSearchResult[],
) {
  const seen = new Set<string>();
  const dedupedPrimary = dedupeRecommendationResults(primary, seen);
  const dedupedFallback = dedupeRecommendationResults(fallback, seen);
  return [...shuffleResults(dedupedPrimary), ...shuffleResults(dedupedFallback)];
}

export function resetTmdbRecommendationCachesForTest() {
  trendingCache = null;
  trendingCachePromise = null;
  similarCache.clear();
  similarCachePromises.clear();
}

function buildRecommendationSourceCacheKey(sourceItems: RecommendationSourceItem[]) {
  return [...sourceItems]
    .sort((left, right) =>
      left.tmdbMediaType === right.tmdbMediaType
        ? left.tmdbId - right.tmdbId
        : left.tmdbMediaType.localeCompare(right.tmdbMediaType),
    )
    .map((item) => buildRecommendationKey(item))
    .join("|");
}

function buildRecommendationKey({
  tmdbId,
  tmdbMediaType,
}: RecommendationSourceItem | TmdbSearchResult) {
  return `${tmdbMediaType}-${tmdbId}`;
}

async function readCachedCollection({
  cacheKey,
  entries,
  inFlight,
  load,
}: {
  cacheKey: string;
  entries: Map<string, RecommendationCacheEntry>;
  inFlight: Map<string, Promise<TmdbSearchResult[]>>;
  load: () => Promise<TmdbSearchResult[]>;
}) {
  const cached = entries.get(cacheKey);
  if (hasFreshEntry(cached)) {
    return shuffleResults(cached.results);
  }

  const pending = inFlight.get(cacheKey);
  if (pending) {
    return shuffleResults(await pending);
  }

  const request = loadAndPersist(load, (results) => {
    entries.set(cacheKey, { results, fetchedAt: Date.now() });
  });

  inFlight.set(
    cacheKey,
    request.finally(() => {
      inFlight.delete(cacheKey);
    }),
  );

  return shuffleResults(await request);
}

async function loadAndPersist(
  load: () => Promise<TmdbSearchResult[]>,
  persist: (results: TmdbSearchResult[]) => void,
) {
  const results = await load();
  persist(results);
  return results;
}

function hasFreshEntry(
  entry: RecommendationCacheEntry | null | undefined,
): entry is RecommendationCacheEntry {
  return entry != null && Date.now() - entry.fetchedAt < RECOMMENDATIONS_CACHE_TTL_MS;
}

function dedupeRecommendationResults(results: TmdbSearchResult[], seen: Set<string>) {
  return results.filter((item) => {
    const key = buildRecommendationKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function shuffleResults(results: TmdbSearchResult[]) {
  const shuffled = [...results];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = getSecureRandomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}
