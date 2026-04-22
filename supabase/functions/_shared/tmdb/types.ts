export type TmdbMediaType = "movie" | "tv";

export type TmdbMultiSearchResponse = {
  results: Array<{
    id: number;
    media_type: string;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    overview?: string;
    poster_path?: string | null;
    release_date?: string;
    first_air_date?: string;
  }>;
};

export type TmdbMovieDetailsResponse = {
  id: number;
  title: string;
  original_title?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
};

export type TmdbTvDetailsResponse = {
  id: number;
  name: string;
  original_name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  first_air_date?: string | null;
  episode_run_time?: number[] | null;
  number_of_seasons?: number | null;
  genres?: Array<{ id: number; name: string }>;
  seasons?: Array<{
    season_number: number;
    name?: string | null;
    overview?: string | null;
    poster_path?: string | null;
    air_date?: string | null;
    episode_count?: number | null;
  }>;
};

export type TmdbSeasonDetailsResponse = {
  id: string;
  season_number: number;
  name: string;
  overview?: string | null;
  poster_path?: string | null;
  air_date?: string | null;
  episodes?: Array<{
    runtime?: number | null;
  }>;
};

export type TmdbExternalIdsResponse = {
  imdb_id?: string | null;
};

export type TmdbWatchProvidersResponse = {
  results?: {
    JP?: {
      flatrate?: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string | null;
      }>;
    };
  };
};

export type TmdbReleaseDatesResponse = {
  results?: Array<{
    iso_3166_1: string;
    release_dates?: Array<{
      certification?: string;
      release_date: string;
      type?: number;
    }>;
  }>;
};

export type TmdbTranslationsResponse = {
  translations?: Array<{
    iso_639_1?: string;
    iso_3166_1?: string;
    data?: {
      title?: string;
      name?: string;
    };
  }>;
};

export type TmdbWatchPlatform = {
  key: string;
  logoPath: string | null;
};

export type TmdbSearchResult = {
  tmdbId: number;
  tmdbMediaType: TmdbMediaType;
  workType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  jpWatchPlatforms: TmdbWatchPlatform[];
  hasJapaneseRelease: boolean;
  rottenTomatoesScore?: number | null;
};

export type TmdbLocalizedSearchMetadata = {
  title: string | null;
  originalTitle: string | null;
  overview: string | null;
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
  tmdbMediaType: TmdbMediaType;
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
  imdbId?: string | null;
};

export const TMDB_PROVIDER_ID_MAP: Record<number, string> = {
  8: "netflix",
  9: "prime_video",
  337: "disney_plus",
  413: "hulu",
  350: "apple_tv_plus",
  2: "apple_tv",
  97: "u_next",
};

export const TRENDING_CACHE_WINDOW = "week";
export const TRENDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const SIMILAR_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TMDB_METADATA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const TMDB_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
export const TMDB_MAX_RETRY_ATTEMPTS = 3;
export const TMDB_RETRY_BASE_DELAY_MS = 400;
export const TMDB_ENRICH_CONCURRENCY = 6;
export const OMDB_ENRICH_CONCURRENCY = 2;
export const MAX_OMDB_ENRICH_RESULTS = 8;
export const MAX_RECOMMENDATION_SOURCE_ITEMS = 8;
export const MAX_SIMILAR_RESULTS_PER_SOURCE = 40;
export const MAX_SIMILAR_RESULTS = 60;
