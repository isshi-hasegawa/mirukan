import { readTmdbMetadataCache, writeTmdbMetadataCache } from "./cache.ts";
import { fetchTmdbJson } from "./http.ts";
import {
  TMDB_PROVIDER_ID_MAP,
  type TmdbMediaType,
  type TmdbReleaseDatesResponse,
  type TmdbWatchPlatform,
  type TmdbWatchProvidersResponse,
} from "./types.ts";

async function fetchWatchProvidersFromTmdb(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<TmdbWatchPlatform[]> {
  try {
    const json = await fetchTmdbJson<TmdbWatchProvidersResponse>(
      `/${mediaType}/${tmdbId}/watch/providers`,
      {},
    );
    const flatrate = json.results?.JP?.flatrate ?? [];

    const seen = new Set<string>();
    const platforms: TmdbWatchPlatform[] = [];
    for (const provider of flatrate) {
      const key = TMDB_PROVIDER_ID_MAP[provider.provider_id];
      if (key && !seen.has(key)) {
        seen.add(key);
        platforms.push({ key, logoPath: provider.logo_path ?? null });
      }
    }

    return platforms;
  } catch {
    return [];
  }
}

async function checkJapaneseRelease(tmdbId: number): Promise<boolean> {
  try {
    const json = await fetchTmdbJson<TmdbReleaseDatesResponse>(
      `/movie/${tmdbId}/release_dates`,
      {},
    );
    const jpRelease = json.results?.find((result) => result.iso_3166_1 === "JP");
    return jpRelease !== undefined && (jpRelease.release_dates?.length ?? 0) > 0;
  } catch {
    return true;
  }
}

function normalizeCachedWatchPlatforms(payload: unknown): TmdbWatchPlatform[] | null {
  if (!Array.isArray(payload)) {
    return null;
  }

  return payload.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const key = "key" in item && typeof item.key === "string" ? item.key : null;
    const logoPath =
      "logoPath" in item && (typeof item.logoPath === "string" || item.logoPath === null)
        ? item.logoPath
        : null;

    return key ? [{ key, logoPath }] : [];
  });
}

export async function fetchWatchProvidersJP(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<TmdbWatchPlatform[]> {
  const cacheKey = `watch-providers:${mediaType}:${tmdbId}:JP`;
  const cached = await readTmdbMetadataCache(cacheKey).catch(() => null);
  const cachedPlatforms = normalizeCachedWatchPlatforms(cached?.payload);

  if (cached?.fresh && cachedPlatforms) {
    return cachedPlatforms;
  }

  const fresh = await fetchWatchProvidersFromTmdb(tmdbId, mediaType).catch(() => null);
  if (fresh) {
    await writeTmdbMetadataCache(cacheKey, fresh).catch(() => undefined);
    return fresh;
  }

  return cachedPlatforms ?? [];
}

function normalizeCachedBoolean(payload: unknown): boolean | null {
  return typeof payload === "boolean" ? payload : null;
}

export async function checkJapaneseReleaseCached(tmdbId: number): Promise<boolean> {
  const cacheKey = `jp-release:movie:${tmdbId}`;
  const cached = await readTmdbMetadataCache(cacheKey).catch(() => null);
  const cachedValue = normalizeCachedBoolean(cached?.payload);

  if (cached?.fresh && cachedValue !== null) {
    return cachedValue;
  }

  const fresh = await checkJapaneseRelease(tmdbId).catch(() => null);
  if (fresh !== null) {
    await writeTmdbMetadataCache(cacheKey, fresh).catch(() => undefined);
    return fresh;
  }

  return cachedValue ?? true;
}
