import type {
  BacklogItem,
  BacklogStatus,
  BoardMode,
  DetailModalEditableField,
  GamePlatform,
  GameReleaseDates,
  DetailModalState,
  PrimaryPlatform,
  WorkSummary,
  WorkType,
} from "./types.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import { gamePlatformKeys, getStatusLabel, isPrimaryPlatformValue } from "./constants.ts";

export function getStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function getNullableStringField(formData: FormData, key: string) {
  const value = getStringField(formData, key).trim();
  return value || null;
}

export function isPrimaryPlatform(value: unknown): value is PrimaryPlatform {
  return value === null || isPrimaryPlatformValue(value);
}

export function normalizePrimaryPlatform(value: string | null): PrimaryPlatform {
  return isPrimaryPlatformValue(value) ? value : null;
}

export function createDetailModalState(
  openItemId: string | null,
  overrides: Partial<Omit<DetailModalState, "openItemId">> = {},
): DetailModalState {
  return {
    openItemId,
    editingField: null,
    draftValue: "",
    message: null,
    ...overrides,
  };
}

export function createDetailEditingState(
  item: BacklogItem,
  field: DetailModalEditableField,
): DetailModalState {
  return createDetailModalState(item.id, {
    editingField: field,
    draftValue: field === "primaryPlatform" ? (item.primary_platform ?? "") : (item.note ?? ""),
  });
}

export function buildSearchText(title: string) {
  return title.trim().toLocaleLowerCase("ja-JP");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getWorkTypeLabel(workType: WorkType) {
  if (workType === "movie") return "映画";
  if (workType === "game") return "ゲーム";
  return "シリーズ";
}

function getBoardModeForWorkType(workType: WorkType): BoardMode {
  return workType === "game" ? "game" : "video";
}

type WorkMetadataLabelOptions = {
  includeReleaseYear?: boolean;
  includeRuntime?: boolean;
  includeSeasonCount?: boolean;
};

export function getWorkMetadataLabels(
  work: WorkSummary,
  {
    includeReleaseYear = false,
    includeRuntime = false,
    includeSeasonCount = false,
  }: WorkMetadataLabelOptions = {},
) {
  const labels: string[] = [];

  if (includeReleaseYear && work.release_date) {
    labels.push(`${work.release_date.slice(0, 4)}年`);
  }

  if (includeRuntime) {
    if (work.work_type === "movie" && work.runtime_minutes) {
      labels.push(`${work.runtime_minutes}分`);
    }

    if (
      work.work_type !== "movie" &&
      work.work_type !== "game" &&
      work.typical_episode_runtime_minutes
    ) {
      labels.push(`1話約${work.typical_episode_runtime_minutes}分`);
    }
  }

  if (includeSeasonCount && work.work_type !== "game" && work.season_count) {
    labels.push(`全${work.season_count}シーズン`);
  }

  return labels;
}

export function getTmdbSearchResultMetadataLabels(result: TmdbSearchResult) {
  return [result.releaseDate ? `${result.releaseDate.slice(0, 4)}年` : null].filter(Boolean);
}

export function getGamePlatformsFromReleaseDates(
  releaseDates: GameReleaseDates | null | undefined,
) {
  if (!releaseDates) {
    return [] as GamePlatform[];
  }

  return gamePlatformKeys.filter((platform) => typeof releaseDates[platform] === "string");
}

export function getStatusActionLabel(work: WorkSummary, status: BacklogStatus) {
  return getStatusLabel(status, getBoardModeForWorkType(work.work_type));
}
