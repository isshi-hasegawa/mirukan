import type { TmdbSeasonOption, TmdbSearchResult, TmdbSelectionTarget } from "../../lib/tmdb.ts";

export type BacklogStatus = "stacked" | "want_to_watch" | "watching" | "interrupted" | "watched";

export type WorkType = "movie" | "series" | "season";
export type SourceType = "tmdb" | "manual";
export type PrimaryPlatform =
  | "netflix"
  | "prime_video"
  | "u_next"
  | "disney_plus"
  | "apple_tv_plus"
  | "theater"
  | "other"
  | null;

export type WorkSummary = {
  id: string;
  title: string;
  work_type: WorkType;
  source_type: SourceType;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  typical_episode_runtime_minutes: number | null;
  duration_bucket: "short" | "medium" | "long" | "very_long" | null;
  genres: string[];
  season_count: number | null;
};

export type BacklogItem = {
  id: string;
  status: BacklogStatus;
  display_title: string | null;
  primary_platform: PrimaryPlatform;
  note: string | null;
  sort_order: number;
  works: WorkSummary | null;
};

export type BacklogItemRow = Omit<BacklogItem, "works"> & {
  works: WorkSummary | WorkSummary[] | null;
};

export type AddModalState = {
  isOpen: boolean;
  defaultStatus: BacklogStatus;
  searchQuery: string;
  searchResults: TmdbSearchResult[];
  selectedTmdbResult: TmdbSearchResult | null;
  selectedTmdbTarget: TmdbSelectionTarget | null;
  seasonOptions: TmdbSeasonOption[];
  isSearching: boolean;
  isLoadingSeasons: boolean;
  searchMessage: string | null;
  manualMode: boolean;
};

export type DetailModalState = {
  openItemId: string | null;
  isEditing: boolean;
  message: string | null;
};

export type DragState = {
  itemId: string;
  sourceStatus: BacklogStatus;
};
