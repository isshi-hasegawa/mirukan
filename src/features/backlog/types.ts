export type BacklogStatus = "stacked" | "want_to_watch" | "watching" | "interrupted" | "watched";
export type ViewingMode = "focus" | "thoughtful" | "quick" | "background";

export type WorkType = "movie" | "series" | "season";
export type SourceType = "tmdb" | "manual";
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
  tmdb_media_type: "movie" | "tv" | null;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  typical_episode_runtime_minutes: number | null;
  duration_bucket: "short" | "medium" | "long" | "very_long" | null;
  genres: string[];
  season_count: number | null;
  season_number: number | null;
  focus_required_score: number | null;
  background_fit_score: number | null;
  completion_load_score: number | null;
};

export type BacklogItem = {
  id: string;
  status: BacklogStatus;
  primary_platform: PrimaryPlatform;
  note: string | null;
  sort_order: number;
  works: WorkSummary | null;
};

export type BacklogItemRow = Omit<BacklogItem, "works"> & {
  works: WorkSummary | WorkSummary[] | null;
};

export type DetailModalState = {
  openItemId: string | null;
  editingField: "primaryPlatform" | "note" | null;
  draftValue: string;
  message: string | null;
};

export type DragState = {
  itemId: string;
  sourceStatus: BacklogStatus;
};

export type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

export type ResolvedDropTarget = {
  status: BacklogStatus;
  targetItemId: string | null;
  side: "before" | "after";
};
