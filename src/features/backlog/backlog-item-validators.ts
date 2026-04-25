import { statusLabels } from "./constants.ts";
import type { BacklogItem, BacklogStatus, WorkSummary } from "./types.ts";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === "number" || value === null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isBacklogStatus(value: unknown): value is BacklogStatus {
  return typeof value === "string" && value in statusLabels;
}

function isWorkType(value: unknown): value is WorkSummary["work_type"] {
  return value === "movie" || value === "series" || value === "season";
}

function isSourceType(value: unknown): value is WorkSummary["source_type"] {
  return value === "tmdb" || value === "manual";
}

function isTmdbMediaType(value: unknown): value is WorkSummary["tmdb_media_type"] {
  return value === "movie" || value === "tv" || value === null;
}

function isDurationBucket(value: unknown): value is WorkSummary["duration_bucket"] {
  return (
    value === "short" ||
    value === "medium" ||
    value === "long" ||
    value === "very_long" ||
    value === null
  );
}

function isBacklogWork(value: unknown): value is NonNullable<BacklogItem["works"]> {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    isWorkType(value.work_type) &&
    isSourceType(value.source_type) &&
    isNullableNumber(value.tmdb_id) &&
    isTmdbMediaType(value.tmdb_media_type) &&
    isNullableString(value.original_title) &&
    isNullableString(value.overview) &&
    isNullableString(value.poster_path) &&
    isNullableString(value.release_date) &&
    isNullableNumber(value.runtime_minutes) &&
    isNullableNumber(value.typical_episode_runtime_minutes) &&
    isDurationBucket(value.duration_bucket) &&
    isStringArray(value.genres) &&
    isNullableNumber(value.season_count) &&
    isNullableNumber(value.season_number) &&
    isNullableNumber(value.focus_required_score) &&
    isNullableNumber(value.background_fit_score) &&
    isNullableNumber(value.completion_load_score)
  );
}

export function normalizeBacklogWork(value: unknown): BacklogItem["works"] {
  if (Array.isArray(value)) {
    return isBacklogWork(value[0]) ? value[0] : null;
  }

  return isBacklogWork(value) ? value : null;
}
