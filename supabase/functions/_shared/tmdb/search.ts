import { translateSearchQuery } from "../gemini.ts";
import { fetchTmdbJson, firstNonBlank, mapWithConcurrency } from "./http.ts";
import { fetchLocalizedSearchMetadata, shouldEnrichLocalizedMetadata } from "./localization.ts";
import { enrichWithCachedOmdbScores } from "./omdb-enrich.ts";
import {
  TMDB_ENRICH_CONCURRENCY,
  type TmdbMediaType,
  type TmdbMultiSearchResponse,
  type TmdbSearchResult,
} from "./types.ts";
import { checkJapaneseReleaseCached, fetchWatchProvidersJP } from "./watch-providers.ts";

export function mapMultiSearchResult(
  result: TmdbMultiSearchResponse["results"][number],
  mediaType: TmdbMediaType,
): TmdbSearchResult | null {
  const title = mediaType === "movie" ? result.title : result.name;

  if (!title) {
    return null;
  }

  return {
    tmdbId: result.id,
    tmdbMediaType: mediaType,
    workType: mediaType === "movie" ? "movie" : "series",
    title,
    originalTitle:
      mediaType === "movie" ? (result.original_title ?? null) : (result.original_name ?? null),
    overview: result.overview ?? null,
    posterPath: result.poster_path ?? null,
    releaseDate:
      mediaType === "movie" ? (result.release_date ?? null) : (result.first_air_date ?? null),
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
    rottenTomatoesScore: null,
  };
}

export async function enrichWithWatchProviders(
  results: TmdbSearchResult[],
): Promise<TmdbSearchResult[]> {
  return mapWithConcurrency(results, TMDB_ENRICH_CONCURRENCY, async (result) => {
    const [jpWatchPlatforms, hasJapaneseRelease, localizedMetadata] = await Promise.all([
      fetchWatchProvidersJP(result.tmdbId, result.tmdbMediaType),
      result.workType === "movie"
        ? checkJapaneseReleaseCached(result.tmdbId)
        : Promise.resolve(true),
      shouldEnrichLocalizedMetadata(result)
        ? fetchLocalizedSearchMetadata(result.tmdbId, result.tmdbMediaType)
        : Promise.resolve(null),
    ]);

    return {
      ...result,
      title: firstNonBlank(localizedMetadata?.title, result.title),
      originalTitle: firstNonBlank(localizedMetadata?.originalTitle, result.originalTitle) || null,
      overview: firstNonBlank(localizedMetadata?.overview, result.overview) || null,
      jpWatchPlatforms,
      hasJapaneseRelease,
    };
  });
}

async function fetchSearchResults(query: string): Promise<TmdbSearchResult[]> {
  const json = await fetchTmdbJson<TmdbMultiSearchResponse>("/search/multi", {
    query,
    language: "ja-JP",
    include_adult: "false",
  });

  const base = json.results.flatMap((result): TmdbSearchResult[] => {
    if (result.media_type !== "movie" && result.media_type !== "tv") {
      return [];
    }

    const mapped = mapMultiSearchResult(result, result.media_type);
    return mapped ? [mapped] : [];
  });

  return enrichWithCachedOmdbScores(await enrichWithWatchProviders(base));
}

function buildFallbackQueries(query: string): string[] {
  const variants: string[] = [];

  // ・をスペースに置換（例: "インディ・ジョーンズ" → "インディ ジョーンズ"）
  const withSpace = query.replaceAll("・", " ").replaceAll(/\s+/g, " ").trim();
  if (withSpace !== query) variants.push(withSpace);

  // ・を除去（例: "インディ・ジョーンズ" → "インディジョーンズ"）
  const withoutDot = query.replaceAll("・", "").trim();
  if (withoutDot !== query && withoutDot !== withSpace) variants.push(withoutDot);

  return variants;
}

export async function searchTmdbWorks(query: string): Promise<TmdbSearchResult[]> {
  const results = await fetchSearchResults(query);
  if (results.length > 0) return results;

  for (const fallback of buildFallbackQueries(query)) {
    const fallbackResults = await fetchSearchResults(fallback);
    if (fallbackResults.length > 0) return fallbackResults;
  }

  try {
    const translatedQuery = await translateSearchQuery(query);
    if (translatedQuery) {
      const translatedResults = await fetchSearchResults(translatedQuery);
      if (translatedResults.length > 0) {
        return translatedResults;
      }
    }
  } catch {
    // Gemini translation is an optional fallback and must not block TMDb search.
  }

  return results;
}
