import type { TmdbSearchResult } from "./types.ts";

export function createMovieResult(
  overrides: Partial<TmdbSearchResult> & { tmdbId: number; title: string },
): TmdbSearchResult {
  return {
    tmdbId: overrides.tmdbId,
    tmdbMediaType: "movie",
    workType: "movie",
    title: overrides.title,
    originalTitle: overrides.originalTitle ?? `${overrides.title} Original`,
    overview: overrides.overview ?? "overview",
    posterPath: overrides.posterPath ?? null,
    releaseDate: overrides.releaseDate ?? "2024-01-01",
    jpWatchPlatforms: overrides.jpWatchPlatforms ?? [],
    hasJapaneseRelease: overrides.hasJapaneseRelease ?? true,
    rottenTomatoesScore: overrides.rottenTomatoesScore ?? null,
  };
}

export function createSeriesResult(
  overrides: Partial<TmdbSearchResult> & { tmdbId: number; title: string },
): TmdbSearchResult {
  return {
    tmdbId: overrides.tmdbId,
    tmdbMediaType: "tv",
    workType: "series",
    title: overrides.title,
    originalTitle: overrides.originalTitle ?? `${overrides.title} Original`,
    overview: overrides.overview ?? "overview",
    posterPath: overrides.posterPath ?? null,
    releaseDate: overrides.releaseDate ?? "2024-01-01",
    jpWatchPlatforms: overrides.jpWatchPlatforms ?? [],
    hasJapaneseRelease: overrides.hasJapaneseRelease ?? true,
    rottenTomatoesScore: overrides.rottenTomatoesScore ?? null,
  };
}
