import { getSupabaseAdminClient } from "../supabase-admin.ts";
import { buildExpiresAt, isCacheEntryFresh, normalizeCachedSearchResult } from "./cache.ts";
import { fetchTmdbJson } from "./http.ts";
import { enrichWithCachedOmdbScores } from "./omdb-enrich.ts";
import { enrichWithWatchProviders, mapMultiSearchResult } from "./search.ts";
import {
  MAX_RECOMMENDATION_SOURCE_ITEMS,
  MAX_SIMILAR_RESULTS,
  MAX_SIMILAR_RESULTS_PER_SOURCE,
  SIMILAR_CACHE_TTL_MS,
  type TmdbMediaType,
  type TmdbMultiSearchResponse,
  type TmdbSearchResult,
} from "./types.ts";

function buildRecommendationSourceKey(item: { tmdbId: number; tmdbMediaType: TmdbMediaType }) {
  return `${item.tmdbMediaType}-${item.tmdbId}`;
}

async function fetchSimilarPage(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<TmdbSearchResult[]> {
  try {
    const json = await fetchTmdbJson<TmdbMultiSearchResponse>(`/${mediaType}/${tmdbId}/similar`, {
      language: "ja-JP",
      page: "1",
    });

    return json.results.flatMap((result): TmdbSearchResult[] => {
      const mapped = mapMultiSearchResult(result, mediaType);
      return mapped ? [mapped] : [];
    });
  } catch {
    return [];
  }
}

function normalizeRecommendationSources(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }>,
) {
  const seen = new Set<string>();
  const uniqueItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }> = [];

  for (const item of sourceItems) {
    const key = `${item.tmdbMediaType}-${item.tmdbId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueItems.push(item);
  }

  return uniqueItems.slice(0, MAX_RECOMMENDATION_SOURCE_ITEMS);
}

function dedupeRecommendationResults(results: TmdbSearchResult[]) {
  const seen = new Set<string>();

  return results.filter((item) => {
    const key = buildRecommendationSourceKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function readSimilarCache(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }>,
) {
  const grouped = new Map<
    string,
    {
      fresh: boolean;
      results: TmdbSearchResult[];
    }
  >();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return grouped;
  }

  const sourceIds = [...new Set(sourceItems.map((item) => item.tmdbId))];
  const validSourceKeys = new Set(sourceItems.map((item) => buildRecommendationSourceKey(item)));

  const { data, error } = await admin
    .from("work_recommendation_cache")
    .select("source_tmdb_media_type, source_tmdb_id, payload, rank, expires_at")
    .eq("recommendation_source", "similar")
    .in("source_tmdb_id", sourceIds)
    .order("rank", { ascending: true });

  if (error) {
    throw new Error(`Failed to read similar cache: ${error.message}`);
  }

  const rowsBySource = new Map<string, Array<{ payload: unknown; expires_at: string | null }>>();
  for (const row of data ?? []) {
    const sourceKey = `${row.source_tmdb_media_type}-${row.source_tmdb_id}`;
    if (!validSourceKeys.has(sourceKey)) {
      continue;
    }

    const current = rowsBySource.get(sourceKey) ?? [];
    current.push({ payload: row.payload, expires_at: row.expires_at });
    rowsBySource.set(sourceKey, current);
  }

  for (const item of sourceItems) {
    const key = buildRecommendationSourceKey(item);
    const rows = rowsBySource.get(key) ?? [];
    grouped.set(key, {
      fresh: rows.length > 0 && rows.every((row) => isCacheEntryFresh(row.expires_at)),
      results: rows.flatMap((row) => {
        const result = normalizeCachedSearchResult(row.payload);
        return result ? [result] : [];
      }),
    });
  }

  return grouped;
}

async function refreshSimilarCacheForSource(sourceItem: {
  tmdbId: number;
  tmdbMediaType: TmdbMediaType;
}) {
  const fresh = await enrichWithCachedOmdbScores(
    await enrichWithWatchProviders(
      dedupeRecommendationResults(
        await fetchSimilarPage(sourceItem.tmdbId, sourceItem.tmdbMediaType),
      ).slice(0, MAX_SIMILAR_RESULTS_PER_SOURCE),
    ),
  );
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return fresh;
  }

  const { error: deleteError } = await admin
    .from("work_recommendation_cache")
    .delete()
    .eq("recommendation_source", "similar")
    .eq("source_tmdb_media_type", sourceItem.tmdbMediaType)
    .eq("source_tmdb_id", sourceItem.tmdbId);

  if (deleteError) {
    throw new Error(`Failed to clear similar cache: ${deleteError.message}`);
  }

  if (fresh.length === 0) {
    return fresh;
  }

  const fetchedAt = new Date().toISOString();
  const expiresAt = buildExpiresAt(SIMILAR_CACHE_TTL_MS);
  const { error: insertError } = await admin.from("work_recommendation_cache").insert(
    fresh.map((result, index) => ({
      recommendation_source: "similar",
      source_tmdb_media_type: sourceItem.tmdbMediaType,
      source_tmdb_id: sourceItem.tmdbId,
      recommended_tmdb_media_type: result.tmdbMediaType,
      recommended_tmdb_id: result.tmdbId,
      rank: index,
      payload: result,
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to write similar cache: ${insertError.message}`);
  }

  return fresh;
}

export async function fetchTmdbSimilar(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }>,
) {
  const normalizedSourceItems = normalizeRecommendationSources(sourceItems);

  if (normalizedSourceItems.length === 0) {
    return [];
  }

  const cached = await readSimilarCache(normalizedSourceItems).catch(() => new Map());
  const resultGroups = await Promise.all(
    normalizedSourceItems.map(async (item) => {
      const key = buildRecommendationSourceKey(item);
      const cacheEntry = cached.get(key);

      if (cacheEntry?.fresh) {
        return cacheEntry.results;
      }

      try {
        const refreshed = await refreshSimilarCacheForSource(item);
        if (refreshed.length > 0 || !cacheEntry) {
          return refreshed;
        }
      } catch {
        // fall through to stale cache
      }

      return cacheEntry?.results ?? [];
    }),
  );

  return dedupeRecommendationResults(resultGroups.flat()).slice(0, MAX_SIMILAR_RESULTS);
}
