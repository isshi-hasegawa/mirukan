import type { TmdbSearchResult, TmdbSeasonOption, TmdbWorkDetails } from "../lib/tmdb.ts";
import type { WorkSummary } from "../features/backlog/types.ts";

export function createWorkSummary(overrides: Partial<WorkSummary> = {}): WorkSummary {
  return {
    id: "work-1",
    title: "Test",
    work_type: "movie",
    source_type: "tmdb",
    tmdb_id: 1,
    tmdb_media_type: "movie",
    original_title: null,
    overview: null,
    poster_path: null,
    release_date: null,
    runtime_minutes: null,
    typical_episode_runtime_minutes: null,
    duration_bucket: null,
    genres: [],
    season_count: null,
    season_number: null,
    focus_required_score: null,
    background_fit_score: null,
    completion_load_score: null,
    rotten_tomatoes_score: null,
    imdb_rating: null,
    imdb_votes: null,
    metacritic_score: null,
    ...overrides,
  };
}

export function createTmdbDetails(overrides: Partial<TmdbWorkDetails> = {}): TmdbWorkDetails {
  return {
    tmdbId: 1,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "テスト作品",
    originalTitle: "Test Work",
    overview: "overview",
    posterPath: "/poster.jpg",
    releaseDate: "2024-01-01",
    genres: ["ドラマ"],
    runtimeMinutes: 120,
    typicalEpisodeRuntimeMinutes: null,
    episodeCount: null,
    seasonCount: null,
    seasonNumber: null,
    imdbId: null,
    ...overrides,
  };
}

export function createSeriesTmdbDetails(
  seriesResult: Pick<TmdbSearchResult, "tmdbId" | "title" | "originalTitle">,
  seasonCount: number,
): TmdbWorkDetails {
  return createTmdbDetails({
    tmdbId: seriesResult.tmdbId,
    tmdbMediaType: "tv",
    workType: "series",
    title: seriesResult.title,
    originalTitle: seriesResult.originalTitle,
    runtimeMinutes: null,
    typicalEpisodeRuntimeMinutes: 48,
    seasonCount,
  });
}

export function createSeasonTmdbDetails(
  seriesResult: Pick<TmdbSearchResult, "tmdbId" | "originalTitle">,
  seasonOption: TmdbSeasonOption,
): TmdbWorkDetails {
  return createTmdbDetails({
    tmdbId: seriesResult.tmdbId,
    tmdbMediaType: "tv",
    workType: "season",
    title: seasonOption.title,
    originalTitle: seriesResult.originalTitle,
    overview: seasonOption.overview,
    posterPath: seasonOption.posterPath,
    releaseDate: seasonOption.releaseDate,
    runtimeMinutes: null,
    typicalEpisodeRuntimeMinutes: 48,
    episodeCount: seasonOption.episodeCount,
    seasonNumber: seasonOption.seasonNumber,
  });
}
