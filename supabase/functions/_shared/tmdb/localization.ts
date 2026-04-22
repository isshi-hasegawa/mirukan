import { readTmdbMetadataCache, writeTmdbMetadataCache } from "./cache.ts";
import { fetchTmdbJson, firstNonBlank } from "./http.ts";
import {
  type TmdbLocalizedSearchMetadata,
  type TmdbMediaType,
  type TmdbMovieDetailsResponse,
  type TmdbSearchResult,
  type TmdbTranslationsResponse,
  type TmdbTvDetailsResponse,
} from "./types.ts";

export async function fetchPreferredJapaneseTitleForPath(path: string, mediaType: TmdbMediaType) {
  try {
    const json = await fetchTmdbJson<TmdbTranslationsResponse>(path, {});
    const japaneseTranslation =
      json.translations?.find(
        (translation) => translation.iso_639_1 === "ja" && translation.iso_3166_1 === "JP",
      ) ?? json.translations?.find((translation) => translation.iso_639_1 === "ja");

    if (!japaneseTranslation?.data) {
      return null;
    }

    if (mediaType === "movie") {
      return japaneseTranslation.data.title ?? null;
    }

    return japaneseTranslation.data.name ?? null;
  } catch {
    return null;
  }
}

function normalizeCachedLocalizedSearchMetadata(
  payload: unknown,
): TmdbLocalizedSearchMetadata | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const title =
    "title" in payload && (typeof payload.title === "string" || payload.title === null)
      ? payload.title
      : null;
  const originalTitle =
    "originalTitle" in payload &&
    (typeof payload.originalTitle === "string" || payload.originalTitle === null)
      ? payload.originalTitle
      : null;
  const overview =
    "overview" in payload && (typeof payload.overview === "string" || payload.overview === null)
      ? payload.overview
      : null;

  return { title, originalTitle, overview };
}

export function shouldEnrichLocalizedMetadata(result: TmdbSearchResult) {
  const titleMatchesOriginal =
    result.originalTitle !== null && result.title.trim() === result.originalTitle.trim();

  return titleMatchesOriginal || !result.overview?.trim();
}

async function fetchLocalizedSearchMetadataFromTmdb(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<TmdbLocalizedSearchMetadata> {
  if (mediaType === "movie") {
    const [json, translatedTitle] = await Promise.all([
      fetchTmdbJson<TmdbMovieDetailsResponse>(`/movie/${tmdbId}`, { language: "ja-JP" }),
      fetchPreferredJapaneseTitleForPath(`/movie/${tmdbId}/translations`, "movie"),
    ]);

    return {
      title: firstNonBlank(translatedTitle, json.title) || null,
      originalTitle: firstNonBlank(json.original_title) || null,
      overview: firstNonBlank(json.overview) || null,
    };
  }

  const [json, translatedTitle] = await Promise.all([
    fetchTmdbJson<TmdbTvDetailsResponse>(`/tv/${tmdbId}`, { language: "ja-JP" }),
    fetchPreferredJapaneseTitleForPath(`/tv/${tmdbId}/translations`, "tv"),
  ]);

  return {
    title: firstNonBlank(translatedTitle, json.name) || null,
    originalTitle: firstNonBlank(json.original_name) || null,
    overview: firstNonBlank(json.overview) || null,
  };
}

export async function fetchLocalizedSearchMetadata(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<TmdbLocalizedSearchMetadata | null> {
  const cacheKey = `localized-search-result:${mediaType}:${tmdbId}`;
  const cached = await readTmdbMetadataCache(cacheKey).catch(() => null);
  const cachedValue = normalizeCachedLocalizedSearchMetadata(cached?.payload);

  if (cached?.fresh && cachedValue) {
    return cachedValue;
  }

  const fresh = await fetchLocalizedSearchMetadataFromTmdb(tmdbId, mediaType).catch(() => null);
  if (fresh) {
    await writeTmdbMetadataCache(cacheKey, fresh).catch(() => undefined);
    return fresh;
  }

  return cachedValue;
}
