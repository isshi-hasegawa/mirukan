export type BacklogStatus = "stacked" | "want_to_watch" | "watching" | "interrupted" | "watched";
export type ViewingMode = "focus" | "thoughtful" | "quick" | "background";
export type BoardMode = "video" | "game";

export type WorkType = "movie" | "series" | "season" | "game";
export type SourceType = "tmdb" | "manual" | "igdb";
export type PrimaryPlatform =
  | "netflix"
  | "prime_video"
  | "u_next"
  | "disney_plus"
  | "hulu"
  | "apple_tv_plus"
  | "apple_tv"
  | null;
export type WorkSummary = {
  id: string;
  title: string;
  work_type: WorkType;
  source_type: SourceType;
  tmdb_id: number | null;
  igdb_id: number | null;
  tmdb_media_type: "movie" | "tv" | null;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  release_dates: GameReleaseDates | null;
  runtime_minutes: number | null;
  typical_episode_runtime_minutes: number | null;
  duration_bucket: "short" | "medium" | "long" | "very_long" | null;
  genres: string[];
  season_count: number | null;
  season_number: number | null;
  developer: string | null;
  publisher: string | null;
  franchise: string | null;
  focus_required_score: number | null;
  background_fit_score: number | null;
  completion_load_score: number | null;
  rotten_tomatoes_score: number | null;
  imdb_rating: number | null;
  imdb_votes: number | null;
  metacritic_score: number | null;
};

export type BacklogItem = {
  id: string;
  status: BacklogStatus;
  display_title?: string | null;
  primary_platform: PrimaryPlatform | GamePlatform;
  note: string | null;
  sort_order: number;
  works: WorkSummary | null;
};

export type DetailModalEditableField = "primaryPlatform" | "note";

export type DetailModalState = {
  openItemId: string | null;
  editingField: DetailModalEditableField | null;
  draftValue: string;
  message: string | null;
};
