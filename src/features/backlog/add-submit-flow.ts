import { buildMoveToStatusConfirmMessage, planBacklogItemUpserts } from "./backlog-item-utils.ts";
import type { BacklogItem, GamePlatform, PrimaryPlatform } from "./types.ts";
import type { IgdbSearchResult } from "../../lib/igdb.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";

type SelectedSubjectOptions = {
  selectedTmdbResult: TmdbSearchResult | null;
  selectedIgdbResult?: IgdbSearchResult | null;
  selectedSeasonNumbers: number[];
  resolvedTitle: string;
};

type ConfirmStackedSaveOptions = {
  items: BacklogItem[];
  workIds: string[];
  subject: string;
  emptyMessage: string;
};

type StackedSaveReview =
  | { type: "ready" }
  | { type: "empty"; message: string }
  | { type: "confirm"; message: string };

export function buildSelectedSubject({
  selectedTmdbResult,
  selectedIgdbResult = null,
  selectedSeasonNumbers,
  resolvedTitle,
}: SelectedSubjectOptions) {
  if (selectedIgdbResult) {
    return `「${selectedIgdbResult.title}」`;
  }

  if (!selectedTmdbResult) {
    return `「${resolvedTitle.trim() || "この作品"}」`;
  }

  if (selectedTmdbResult.tmdbMediaType !== "tv") {
    return `「${selectedTmdbResult.title}」`;
  }

  if (selectedSeasonNumbers.length <= 3) {
    return selectedSeasonNumbers.map((seasonNumber) => `シーズン${seasonNumber}`).join("・");
  }

  return `${selectedSeasonNumbers.length}シーズン`;
}

export function buildStackedBacklogOptions(
  primaryPlatform: PrimaryPlatform | GamePlatform,
  note: string,
) {
  return {
    primary_platform: primaryPlatform,
    note: note.trim() || null,
  };
}

export function confirmStackedSave({
  items,
  workIds,
  subject,
  emptyMessage,
}: ConfirmStackedSaveOptions): StackedSaveReview {
  const plan = planBacklogItemUpserts(items, workIds, "stacked");
  const confirmMessage = buildMoveToStatusConfirmMessage(
    plan.existingOtherItems,
    "stacked",
    subject,
  );

  if (confirmMessage) {
    return { type: "confirm", message: confirmMessage };
  }

  if (plan.actions.length === 0) {
    return { type: "empty", message: emptyMessage };
  }

  return { type: "ready" };
}
