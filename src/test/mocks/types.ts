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
  rottenTomatoesScore?: number | null;
};

export type TmdbSeasonOption = {
  seasonNumber: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  episodeCount: number | null;
};

export type TmdbSelectionTarget =
  | TmdbSearchResult
  | {
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

export type TmdbWorkDetails = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
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
  created_by?: string;
  source_type?: "tmdb" | "manual";
  work_type?: "movie" | "series" | "season";
  search_text?: string;
  tmdb_id: number | null;
  tmdb_media_type: "movie" | "tv" | null;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  parent_work_id?: string | null;
  runtime_minutes?: number | null;
  typical_episode_runtime_minutes?: number | null;
  duration_bucket?: "short" | "medium" | "long" | "very_long" | null;
  genres?: string[];
  season_count?: number | null;
  season_number: number | null;
  episode_count: number | null;
  focus_required_score?: number | null;
  background_fit_score?: number | null;
  completion_load_score?: number | null;
  last_tmdb_synced_at?: string | null;
  series_title: string | null;
};
