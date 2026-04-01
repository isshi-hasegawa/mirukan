import { normalizePrimaryPlatform } from "./helpers.ts";
import {
  buildMoveToStatusConfirmMessage,
  planBacklogItemUpserts,
} from "./backlog-item-utils.ts";
import type { BacklogItem } from "./types.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import type { BacklogFeedback } from "./ui-feedback.ts";

type SelectedSubjectOptions = {
  selectedTmdbResult: TmdbSearchResult | null;
  selectedSeasonNumbers: number[];
  resolvedTitle: string;
};

type ConfirmStackedSaveOptions = {
  items: BacklogItem[];
  workIds: string[];
  subject: string;
  emptyMessage: string;
  feedback: Pick<BacklogFeedback, "confirm">;
};

export function buildSelectedSubject({
  selectedTmdbResult,
  selectedSeasonNumbers,
  resolvedTitle,
}: SelectedSubjectOptions) {
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

export function buildStackedBacklogOptions(primaryPlatform: string, note: string) {
  return {
    primaryPlatform: normalizePrimaryPlatform(primaryPlatform),
    note: note.trim() || null,
  };
}

export async function confirmStackedSave({
  items,
  workIds,
  subject,
  emptyMessage,
  feedback,
}: ConfirmStackedSaveOptions): Promise<
  { shouldSave: true } | { shouldSave: false; message: string }
> {
  const plan = planBacklogItemUpserts(items, workIds, "stacked");
  const confirmMessage = buildMoveToStatusConfirmMessage(
    plan.existingOtherItems,
    "stacked",
    subject,
  );
  const shouldProceed =
    !confirmMessage || (await Promise.resolve(feedback.confirm(confirmMessage)));

  if (!shouldProceed) {
    return { shouldSave: false, message: "既存カードはそのままにしました。" };
  }

  if (plan.actions.length === 0) {
    return { shouldSave: false, message: emptyMessage };
  }

  return { shouldSave: true };
}
