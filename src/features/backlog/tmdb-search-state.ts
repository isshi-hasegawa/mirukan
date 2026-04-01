import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import { statusLabels } from "./constants.ts";
import type { BacklogItem } from "./types.ts";

export type DuplicateState = {
  notice: string | null;
  canAddToStacked: boolean;
};

export function findMatchingTvItem(
  items: BacklogItem[],
  result: TmdbSearchResult,
  seasonNumber: number,
) {
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
    return { notice: null, canAddToStacked: true };
  }

  const uniqueLabels = [...new Set(matches.map((item) => statusLabels[item.status]))];
  const canRestoreToStacked = matches.some((item) => item.status !== "stacked");

  if (result.tmdbMediaType === "tv") {
    const duplicatedSeasons = seasonNumbers.filter((seasonNumber) =>
      items.some((item) => {
        const work = item.works;
        if (work?.tmdb_id !== result.tmdbId || work.tmdb_media_type !== result.tmdbMediaType) {
          return false;
        }

        return seasonNumber === 1
          ? work.work_type === "series"
          : work.work_type === "season" && work.season_number === seasonNumber;
      }),
    );
    const canAddAnySelectedSeason = seasonNumbers.some((seasonNumber) => {
      const existingItem = findMatchingTvItem(items, result, seasonNumber);
      return !existingItem || existingItem.status !== "stacked";
    });
    const seasonLabel = duplicatedSeasons
      .map((seasonNumber) => `シーズン${seasonNumber}`)
      .join("・");

    return {
      notice: canRestoreToStacked
        ? `${seasonLabel}はすでに「${uniqueLabels.join("・")}」にあります。追加するとストックに戻せます。`
        : `${seasonLabel}はすでにストックにあります。`,
      canAddToStacked: canAddAnySelectedSeason,
    };
  }

  return {
    notice: canRestoreToStacked
      ? `すでに「${uniqueLabels.join("・")}」にあります。追加するとストックに戻せます。`
      : "すでにストックにあります。",
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
    duplicateNotice: duplicateState.notice,
    canAddSelectionToStacked: duplicateState.canAddToStacked,
  };
}
