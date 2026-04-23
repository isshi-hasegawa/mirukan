import type { TmdbSearchResult } from "./types.ts";

type ResultKind = {
  tmdbMediaType: TmdbSearchResult["tmdbMediaType"];
  workType: TmdbSearchResult["workType"];
};

function createResult(
  kind: ResultKind,
  overrides: Partial<TmdbSearchResult> & { tmdbId: number; title: string },
): TmdbSearchResult {
  return {
    tmdbId: overrides.tmdbId,
    tmdbMediaType: kind.tmdbMediaType,
    workType: kind.workType,
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

export function createMovieResult(
  overrides: Partial<TmdbSearchResult> & { tmdbId: number; title: string },
): TmdbSearchResult {
  return createResult({ tmdbMediaType: "movie", workType: "movie" }, overrides);
}

export function createSeriesResult(
  overrides: Partial<TmdbSearchResult> & { tmdbId: number; title: string },
): TmdbSearchResult {
  return createResult({ tmdbMediaType: "tv", workType: "series" }, overrides);
}
