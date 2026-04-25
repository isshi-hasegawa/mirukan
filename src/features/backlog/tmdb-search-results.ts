import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import { getStackedSeasonNumbers } from "./tmdb-search-state.ts";
import type { BacklogItem } from "./types.ts";

const MAX_RECOMMENDATION_SOURCE_ITEMS = 8;

function isStackedMovieMatch(items: BacklogItem[], result: TmdbSearchResult) {
  return items.some((item) => {
    const work = item.works;
    return (
      item.status === "stacked" &&
      work?.tmdb_id === result.tmdbId &&
      work.tmdb_media_type === result.tmdbMediaType &&
      work.work_type === result.workType
    );
  });
}

function findStackedSeriesItem(items: BacklogItem[], result: TmdbSearchResult) {
  return items.find((item) => {
    const work = item.works;
    return (
      item.status === "stacked" &&
      work?.tmdb_id === result.tmdbId &&
      work.tmdb_media_type === result.tmdbMediaType &&
      work.work_type === "series"
    );
  });
}

function isAllSeasonsStacked(items: BacklogItem[], result: TmdbSearchResult, seasonCount: number) {
  const stackedSeasonNumbers = new Set(
    getStackedSeasonNumbers(
      items,
      result,
      Array.from({ length: Math.max(seasonCount - 1, 0) }, (_, index) => index + 2),
    ),
  );

  for (let seasonNumber = 2; seasonNumber <= seasonCount; seasonNumber += 1) {
    if (!stackedSeasonNumbers.has(seasonNumber)) {
      return false;
    }
  }

  return true;
}

function isHiddenSearchResult(items: BacklogItem[], result: TmdbSearchResult) {
  if (result.tmdbMediaType === "movie" && result.workType === "movie") {
    return isStackedMovieMatch(items, result);
  }

  if (result.tmdbMediaType !== "tv" || result.workType !== "series") {
    return false;
  }

  const stackedSeriesItem = findStackedSeriesItem(items, result);
  const seasonCount = stackedSeriesItem?.works?.season_count;
  if (!seasonCount) return false;

  return isAllSeasonsStacked(items, result, seasonCount);
}

export function filterVisibleResults(items: BacklogItem[], results: TmdbSearchResult[]) {
  return results.filter((result) => !isHiddenSearchResult(items, result));
}

function getLocalizationScore(result: TmdbSearchResult) {
  let score = 0;

  if (result.title.trim() !== result.originalTitle?.trim()) {
    score += 2;
  }

  if (result.overview?.trim()) {
    score += 1;
  }

  return score;
}

export function prioritizeLocalizedResults(results: TmdbSearchResult[]) {
  return results
    .map((result, index) => ({ result, index }))
    .sort((left, right) => {
      const scoreDiff = getLocalizationScore(right.result) - getLocalizationScore(left.result);
      return scoreDiff === 0 ? left.index - right.index : scoreDiff;
    })
    .map(({ result }) => result);
}

export function resolveSearchMessage(
  results: TmdbSearchResult[],
  visibleResults: TmdbSearchResult[],
) {
  if (visibleResults.length > 0) {
    return null;
  }

  if (results.length > 0) {
    return "すでにストック済みの作品は候補から除外しています。";
  }

  return "候補が見つかりませんでした。このまま入力して追加できます。";
}

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = getSecureRandomInt(index + 1);
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function getSecureRandomInt(maxExclusive: number) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive integer");
  }

  const maxUint32 = 0x100000000;
  const upperBound = maxUint32 - (maxUint32 % maxExclusive);
  const randomBuffer = new Uint32Array(1);

  while (true) {
    globalThis.crypto.getRandomValues(randomBuffer);
    const value = randomBuffer[0] ?? 0;

    if (value < upperBound) {
      return value % maxExclusive;
    }
  }
}

export function buildRecommendationSourceItems(items: BacklogItem[]) {
  const recommendationCandidates = items.filter(
    (item) =>
      (item.status === "watched" || item.status === "watching") &&
      item.works?.tmdb_id != null &&
      item.works?.source_type === "tmdb" &&
      item.works?.work_type !== "season",
  );

  return [
    ...shuffleArray(recommendationCandidates.filter((item) => item.status === "watched")),
    ...shuffleArray(recommendationCandidates.filter((item) => item.status === "watching")),
  ]
    .slice(0, MAX_RECOMMENDATION_SOURCE_ITEMS)
    .map((item) => ({
      tmdbId: item.works!.tmdb_id!,
      tmdbMediaType: item.works!.tmdb_media_type as "movie" | "tv",
    }));
}

export function filterVisibleRecommendations(items: BacklogItem[], results: TmdbSearchResult[]) {
  const itemTmdbKeys = new Set(
    items
      .filter((item) => item.works?.tmdb_id && item.works?.tmdb_media_type)
      .map((item) => `${item.works!.tmdb_media_type}-${item.works!.tmdb_id}`),
  );

  return prioritizeLocalizedResults(
    filterVisibleResults(items, results).filter(
      (result) =>
        !itemTmdbKeys.has(`${result.tmdbMediaType}-${result.tmdbId}`) &&
        (result.workType === "series" || result.hasJapaneseRelease),
    ),
  );
}
