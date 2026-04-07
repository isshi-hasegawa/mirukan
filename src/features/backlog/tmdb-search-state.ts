import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import type { BacklogItem } from "./types.ts";

type DuplicateState = {
  canAddToStacked: boolean;
};

function findMatchingTvItem(items: BacklogItem[], result: TmdbSearchResult, seasonNumber: number) {
  return items.find((item) => {
    const work = item.works;
    if (work?.tmdb_id !== result.tmdbId || work.tmdb_media_type !== result.tmdbMediaType) {
      return false;
    }

    return seasonNumber === 1
      ? work.work_type === "series"
      : work.work_type === "season" && work.season_number === seasonNumber;
  });
}

export function getStackedSeasonNumbers(
  items: BacklogItem[],
  result: TmdbSearchResult,
  seasonNumbers: number[],
) {
  if (result.tmdbMediaType !== "tv") return [];

  return seasonNumbers.filter((seasonNumber) => {
    const existingItem = findMatchingTvItem(items, result, seasonNumber);
    return existingItem?.status === "stacked";
  });
}

export function mergeSeasonNumbers(
  selectedSeasonNumbers: number[],
  stackedSeasonNumbers: number[],
) {
  return [...new Set([...selectedSeasonNumbers, ...stackedSeasonNumbers])].sort(
    (left, right) => left - right,
  );
}

export function buildDuplicateState(
  items: BacklogItem[],
  result: TmdbSearchResult,
  seasonNumbers: number[] = [],
): DuplicateState {
  const matches = items.filter((item) => {
    const work = item.works;
    if (work?.tmdb_id !== result.tmdbId || work?.tmdb_media_type !== result.tmdbMediaType) {
      return false;
    }

    if (result.tmdbMediaType === "tv") {
      return seasonNumbers.some((seasonNumber) =>
        seasonNumber === 1
          ? work?.work_type === "series"
          : work?.work_type === "season" && work?.season_number === seasonNumber,
      );
    }

    return work?.work_type === result.workType;
  });

  if (matches.length === 0) {
    return { canAddToStacked: true };
  }

  const canRestoreToStacked = matches.some((item) => item.status !== "stacked");

  if (result.tmdbMediaType === "tv") {
    const canAddAnySelectedSeason = seasonNumbers.some((seasonNumber) => {
      const existingItem = findMatchingTvItem(items, result, seasonNumber);
      return !existingItem || existingItem.status !== "stacked";
    });
    return { canAddToStacked: canAddAnySelectedSeason };
  }

  return {
    canAddToStacked: canRestoreToStacked,
  };
}

export function buildTvSelectionState(
  items: BacklogItem[],
  result: TmdbSearchResult,
  selectedSeasonNumbers: number[],
) {
  const duplicateState = buildDuplicateState(items, result, selectedSeasonNumbers);

  return {
    selectedSeasonNumbers,
    canAddSelectionToStacked: duplicateState.canAddToStacked,
  };
}
