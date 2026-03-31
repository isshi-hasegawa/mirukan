import { viewingModeOrder } from "./constants.ts";
import type { BacklogItem, ViewingMode, WorkSummary } from "./types.ts";

export function getViewingMode(work: WorkSummary): ViewingMode | null {
  return viewingModeOrder.find((mode) => applyModeFilter(work, mode)) ?? null;
}

export function sortStackedItemsByViewingMode(
  items: BacklogItem[],
  activeMode: ViewingMode | null,
): BacklogItem[] {
  if (!activeMode) {
    return items;
  }

  const prioritized: BacklogItem[] = [];
  const rest: BacklogItem[] = [];

  for (const item of items) {
    if (item.works && getViewingMode(item.works) === activeMode) {
      prioritized.push(item);
    } else {
      rest.push(item);
    }
  }

  return [...prioritized, ...rest];
}

export function applyModeFilter(work: WorkSummary, mode: ViewingMode): boolean {
  if (mode === "background") {
    return work.background_fit_score !== null && work.background_fit_score >= 50;
  }

  const duration =
    work.work_type === "movie" ? work.runtime_minutes : work.typical_episode_runtime_minutes;

  if (duration === null) return false;
  if (mode === "focus" && duration < 80) return false;
  if (mode === "thoughtful" && (duration < 40 || duration >= 80)) return false;
  if (mode === "quick" && duration >= 40) return false;

  return true;
}
