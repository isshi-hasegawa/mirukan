import { getSupabaseAdminClient } from "../supabase-admin.ts";
import { TMDB_METADATA_CACHE_TTL_MS, type TmdbSearchResult } from "./types.ts";

type TmdbMetadataCacheRow = {
  payload: unknown;
  expires_at: string | null;
};

export function isCacheEntryFresh(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(expiresAt);
  return !Number.isNaN(expiresAtMs) && expiresAtMs > Date.now();
}

export function buildExpiresAt(ttlMs: number) {
  return new Date(Date.now() + ttlMs).toISOString();
}

export function normalizeCachedSearchResult(payload: unknown): TmdbSearchResult | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload as TmdbSearchResult;
}

export async function readTmdbMetadataCache(
  cacheKey: string,
): Promise<{ fresh: boolean; payload: unknown } | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("tmdb_metadata_cache")
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle<TmdbMetadataCacheRow>();

  if (error) {
    throw new Error(`Failed to read TMDb metadata cache: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    fresh: isCacheEntryFresh(data.expires_at),
    payload: data.payload,
  };
}

export async function writeTmdbMetadataCache(cacheKey: string, payload: unknown) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return;
  }

  const { error } = await admin.from("tmdb_metadata_cache").upsert({
    cache_key: cacheKey,
    payload,
    fetched_at: new Date().toISOString(),
    expires_at: buildExpiresAt(TMDB_METADATA_CACHE_TTL_MS),
  });

  if (error) {
    throw new Error(`Failed to write TMDb metadata cache: ${error.message}`);
  }
}
