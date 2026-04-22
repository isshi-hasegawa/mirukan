import { getSupabaseAdminClient } from "../supabase-admin.ts";
import { buildExpiresAt, isCacheEntryFresh, normalizeCachedSearchResult } from "./cache.ts";
import { fetchTmdbJson } from "./http.ts";
import { enrichWithCachedOmdbScores } from "./omdb-enrich.ts";
import { enrichWithWatchProviders, mapMultiSearchResult } from "./search.ts";
import {
  TRENDING_CACHE_TTL_MS,
  TRENDING_CACHE_WINDOW,
  type TmdbMediaType,
  type TmdbMultiSearchResponse,
  type TmdbSearchResult,
} from "./types.ts";

type TmdbTrendingCacheRow = {
  payload: unknown;
  rank: number;
  expires_at: string | null;
};

async function fetchTrendingPage(page: number): Promise<TmdbSearchResult[]> {
  const json = await fetchTmdbJson<TmdbMultiSearchResponse>("/trending/all/week", {
    language: "ja-JP",
    page: page.toString(),
  });

  return json.results.flatMap((result): TmdbSearchResult[] => {
    if (result.media_type !== "movie" && result.media_type !== "tv") {
      return [];
    }

    const mapped = mapMultiSearchResult(result, result.media_type as TmdbMediaType);
    return mapped ? [mapped] : [];
  });
}

async function fetchFreshTmdbTrending(): Promise<TmdbSearchResult[]> {
  const pages = await Promise.all([
    fetchTrendingPage(1),
    fetchTrendingPage(2),
    fetchTrendingPage(3),
  ]);
  const seen = new Set<string>();

  return enrichWithCachedOmdbScores(
    await enrichWithWatchProviders(
      pages.flat().filter((item) => {
        const key = `${item.tmdbMediaType}-${item.tmdbId}`;
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      }),
    ),
  );
}

async function readTrendingCache() {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("tmdb_trending_cache")
    .select("payload, rank, expires_at")
    .eq("cache_window", TRENDING_CACHE_WINDOW)
    .order("rank", { ascending: true });

  if (error) {
    throw new Error(`Failed to read trending cache: ${error.message}`);
  }

  const rows = (data ?? []) as TmdbTrendingCacheRow[];
  const results = rows
    .flatMap((row): TmdbSearchResult[] => {
      const result = normalizeCachedSearchResult(row.payload);
      return result ? [result] : [];
    })
    .filter((result): result is TmdbSearchResult => result !== null);

  return {
    fresh: rows.length > 0 && rows.every((row) => isCacheEntryFresh(row.expires_at)),
    results,
    admin,
  };
}

async function writeTrendingCache(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  results: TmdbSearchResult[],
) {
  const fetchedAt = new Date().toISOString();
  const expiresAt = buildExpiresAt(TRENDING_CACHE_TTL_MS);

  const { error: deleteError } = await admin
    .from("tmdb_trending_cache")
    .delete()
    .eq("cache_window", TRENDING_CACHE_WINDOW);

  if (deleteError) {
    throw new Error(`Failed to clear trending cache: ${deleteError.message}`);
  }

  if (results.length === 0) {
    return;
  }

  const { error: insertError } = await admin.from("tmdb_trending_cache").insert(
    results.map((result, index) => ({
      cache_window: TRENDING_CACHE_WINDOW,
      rank: index,
      tmdb_media_type: result.tmdbMediaType,
      tmdb_id: result.tmdbId,
      payload: result,
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to write trending cache: ${insertError.message}`);
  }
}

export async function fetchTmdbTrending(): Promise<TmdbSearchResult[]> {
  const cached = await readTrendingCache().catch(() => null);
  if (cached?.fresh && cached.results.length > 0) {
    return cached.results;
  }

  try {
    const fresh = await fetchFreshTmdbTrending();
    if (cached?.admin) {
      await writeTrendingCache(cached.admin, fresh);
    }
    return fresh;
  } catch (error) {
    if (cached && cached.results.length > 0) {
      return cached.results;
    }

    throw error;
  }
}
