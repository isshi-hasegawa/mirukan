import { supabase } from "./supabase.ts";

export type TmdbWatchPlatform = {
  key: string;
  logoPath: string | null;
};

export type TmdbSearchResult = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  workType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  jpWatchPlatforms: TmdbWatchPlatform[];
  hasJapaneseRelease: boolean;
};

export type TmdbSeasonSelectionTarget = {
  tmdbId: number;
  tmdbMediaType: "tv";
  workType: "season";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  seasonNumber: number;
  episodeCount: number | null;
  seriesTitle: string;
};

export type TmdbSeasonOption = {
  seasonNumber: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  episodeCount: number | null;
};

export type TmdbSelectionTarget = TmdbSearchResult | TmdbSeasonSelectionTarget;

export type TmdbWorkDetails = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  workType: "movie" | "series" | "season";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  typicalEpisodeRuntimeMinutes: number | null;
  episodeCount: number | null;
  seasonCount: number | null;
  seasonNumber: number | null;
};

type RecommendationCacheEntry = {
  results: TmdbSearchResult[];
  fetchedAt: number;
};

const RECOMMENDATIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let trendingCache: RecommendationCacheEntry | null = null;
let trendingCachePromise: Promise<TmdbSearchResult[]> | null = null;
const similarCache = new Map<string, RecommendationCacheEntry>();
const similarCachePromises = new Map<string, Promise<TmdbSearchResult[]>>();

async function invokeTmdbFunction<TResponse>(
  functionName: string,
  body?: Record<string, unknown>,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    throw new Error(`Supabase function ${functionName} failed: ${error.message}`);
  }

  return data as TResponse;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeRecommendationSources(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }> {
  const seen = new Set<string>();
  const uniqueItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }> = [];

  for (const item of sourceItems) {
    const key = `${item.tmdbMediaType}-${item.tmdbId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueItems.push(item);
  }

  return uniqueItems.slice(0, 5);
}

function buildRecommendationSourceCacheKey(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): string {
  return [...sourceItems]
    .sort((a, b) =>
      a.tmdbMediaType === b.tmdbMediaType
        ? a.tmdbId - b.tmdbId
        : a.tmdbMediaType.localeCompare(b.tmdbMediaType),
    )
    .map((item) => `${item.tmdbMediaType}-${item.tmdbId}`)
    .join("|");
}

export async function fetchTmdbSimilar(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): Promise<TmdbSearchResult[]> {
  const normalizedSourceItems = normalizeRecommendationSources(sourceItems);

  if (normalizedSourceItems.length === 0) {
    return [];
  }

  const cacheKey = buildRecommendationSourceCacheKey(normalizedSourceItems);
  const cached = similarCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < RECOMMENDATIONS_CACHE_TTL_MS) {
    return shuffleArray(cached.results);
  }

  const inFlight = similarCachePromises.get(cacheKey);
  if (inFlight) {
    return shuffleArray(await inFlight);
  }

  const request = (async () => {
    const results = await invokeTmdbFunction<TmdbSearchResult[]>("fetch-tmdb-similar", {
      sourceItems: normalizedSourceItems,
    });

    similarCache.set(cacheKey, { results, fetchedAt: Date.now() });
    return results;
  })();

  similarCachePromises.set(
    cacheKey,
    request.finally(() => {
      similarCachePromises.delete(cacheKey);
    }),
  );

  return shuffleArray(await request);
}

export async function fetchTmdbRecommendations(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): Promise<TmdbSearchResult[]> {
  const [similar, trending] = await Promise.all([
    fetchTmdbSimilar(sourceItems),
    fetchTmdbTrending(),
  ]);
  const seen = new Set<string>();
  const dedupedSimilar = similar.filter((item) => {
    const key = `${item.tmdbMediaType}-${item.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const trendingSupplement = trending.filter((item) => {
    const key = `${item.tmdbMediaType}-${item.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return [...shuffleArray(dedupedSimilar), ...shuffleArray(trendingSupplement)];
}

export async function fetchTmdbTrending(): Promise<TmdbSearchResult[]> {
  if (trendingCache && Date.now() - trendingCache.fetchedAt < RECOMMENDATIONS_CACHE_TTL_MS) {
    return shuffleArray(trendingCache.results);
  }

  if (trendingCachePromise) {
    return shuffleArray(await trendingCachePromise);
  }

  const request = (async () => {
    const results = await invokeTmdbFunction<TmdbSearchResult[]>("fetch-tmdb-trending");
    trendingCache = { results, fetchedAt: Date.now() };
    return results;
  })();

  trendingCachePromise = request.finally(() => {
    trendingCachePromise = null;
  });

  return shuffleArray(await request);
}

export function resetTmdbRecommendationCachesForTest() {
  trendingCache = null;
  trendingCachePromise = null;
  similarCache.clear();
  similarCachePromises.clear();
}

export function searchTmdbWorks(query: string) {
  return invokeTmdbFunction<TmdbSearchResult[]>("search-tmdb-works", { query });
}

export function fetchTmdbSeasonOptions(result: TmdbSearchResult): Promise<TmdbSeasonOption[]> {
  return invokeTmdbFunction<TmdbSeasonOption[]>("fetch-tmdb-season-options", { result });
}

export function fetchTmdbWorkDetails(target: TmdbSelectionTarget): Promise<TmdbWorkDetails> {
  return invokeTmdbFunction<TmdbWorkDetails>("fetch-tmdb-work-details", { target });
}

function firstNonBlank(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function resolveSeasonTitle(
  seriesTitle: string,
  seasonNumber: number,
  ...candidates: Array<string | null | undefined>
) {
  const fallback = `${seriesTitle} シーズン${seasonNumber}`;
  const chosen = firstNonBlank(...candidates);

  if (!chosen || isGenericSeasonLabel(chosen)) {
    return fallback;
  }

  if (chosen.toLowerCase().includes(seriesTitle.toLowerCase())) {
    return chosen;
  }

  return `${seriesTitle} ${chosen}`;
}

function isGenericSeasonLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    /^season\s*\d+$/i.test(value.trim()) ||
    /^シーズン\s*\d+$/.test(value.trim()) ||
    normalized === "season" ||
    normalized === "シーズン"
  );
}
