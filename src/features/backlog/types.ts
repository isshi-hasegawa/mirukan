import type { TmdbSearchResult } from "../../lib/tmdb.ts";

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
  release_date: string | null;
  duration_bucket: "short" | "medium" | "long" | "very_long" | null;
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
  isSearching: boolean;
  searchMessage: string | null;
  manualMode: boolean;
};

export type DragState = {
  itemId: string;
  sourceStatus: BacklogStatus;
};
