/**
 * Type definitions for MSW handlers
 */

export type TmdbSearchResult = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  workType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  jpWatchPlatforms: { key: string; logoPath: string | null }[];
  hasJapaneseRelease: boolean;
};

export type TmdbFunctionResponse<T> =
  | {
      data: T;
      error: null;
    }
  | {
      data: null;
      error: { message: string };
    };

export type BacklogItem = {
  id: string;
  user_id: string;
  work_id: string;
  status: "stacked" | "want_to_watch" | "watching" | "interrupted" | "watched";
  sort_order: number;
  display_title: string;
  primary_platform: string | null;
  note: string | null;
};

export type Work = {
  id: string;
  tmdb_id: number | null;
  tmdb_media_type: "movie" | "tv" | null;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  season_number: number | null;
  episode_count: number | null;
  series_title: string | null;
};

export type PostgrestResponse<T> =
  | {
      data: T[];
      error: null;
    }
  | {
      data: null;
      error: { message: string };
    };
