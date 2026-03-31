import { useEffect, useRef, useState } from "react";
import {
  fetchTmdbRecommendations,
  fetchTmdbSeasonOptions,
  searchTmdbWorks,
} from "../../../lib/tmdb.ts";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import type { BacklogItem } from "../types.ts";
import { statusLabels } from "../constants.ts";

type DuplicateState = {
  notice: string | null;
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

function getStackedSeasonNumbers(
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

function isHiddenSearchResult(items: BacklogItem[], result: TmdbSearchResult) {
  if (result.tmdbMediaType === "movie" && result.workType === "movie") {
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

  if (result.tmdbMediaType !== "tv" || result.workType !== "series") {
    return false;
  }

  const stackedSeriesItem = items.find((item) => {
    const work = item.works;
    return (
      item.status === "stacked" &&
      work?.tmdb_id === result.tmdbId &&
      work.tmdb_media_type === result.tmdbMediaType &&
      work.work_type === "series"
    );
  });

  const seasonCount = stackedSeriesItem?.works?.season_count;
  if (!seasonCount) return false;

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

function filterVisibleResults(items: BacklogItem[], results: TmdbSearchResult[]) {
  return results.filter((result) => !isHiddenSearchResult(items, result));
}

function buildRecommendationSourceItems(items: BacklogItem[]) {
  return items
    .filter(
      (item) =>
        (item.status === "watched" || item.status === "watching") &&
        item.works?.tmdb_id != null &&
        item.works?.source_type === "tmdb" &&
        item.works?.work_type !== "season",
    )
    .sort((a, b) => {
      if (a.status === "watched" && b.status !== "watched") return -1;
      if (a.status !== "watched" && b.status === "watched") return 1;
      return Math.random() - 0.5;
    })
    .slice(0, 5)
    .map((item) => ({
      tmdbId: item.works!.tmdb_id!,
      tmdbMediaType: item.works!.tmdb_media_type as "movie" | "tv",
    }));
}

function filterVisibleRecommendations(items: BacklogItem[], results: TmdbSearchResult[]) {
  const itemTmdbKeys = new Set(
    items
      .filter((item) => item.works?.tmdb_id && item.works?.tmdb_media_type)
      .map((item) => `${item.works!.tmdb_media_type}-${item.works!.tmdb_id}`),
  );

  return filterVisibleResults(items, results).filter(
    (result) =>
      !itemTmdbKeys.has(`${result.tmdbMediaType}-${result.tmdbId}`) &&
      (result.workType === "series" || result.hasJapaneseRelease),
  );
}

function buildDuplicateState(
  items: BacklogItem[],
  result: TmdbSearchResult,
  seasonNumbers: number[] = [],
): DuplicateState {
  const matches = items.filter((item) => {
    const w = item.works;
    if (w?.tmdb_id !== result.tmdbId || w?.tmdb_media_type !== result.tmdbMediaType) return false;
    if (result.tmdbMediaType === "tv") {
      return seasonNumbers.some((seasonNumber) =>
        seasonNumber === 1
          ? w?.work_type === "series"
          : w?.work_type === "season" && w?.season_number === seasonNumber,
      );
    }
    return w?.work_type === result.workType;
  });

  if (matches.length === 0) {
    return { notice: null, canAddToStacked: true };
  }

  const labels = matches.map((item) => statusLabels[item.status]);
  const unique = [...new Set(labels)];
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
        ? `${seasonLabel}はすでに「${unique.join("・")}」にあります。追加するとストックに戻せます。`
        : `${seasonLabel}はすでにストックにあります。`,
      canAddToStacked: canAddAnySelectedSeason,
    };
  }

  return {
    notice: canRestoreToStacked
      ? `すでに「${unique.join("・")}」にあります。追加するとストックに戻せます。`
      : "すでにストックにあります。",
    canAddToStacked: canRestoreToStacked,
  };
}

const SEARCH_DEBOUNCE_MS = 250;

type UseTmdbSearchOptions = {
  items: BacklogItem[];
};

export function useTmdbSearch({ items }: UseTmdbSearchOptions) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [recommendedResults, setRecommendedResults] = useState<TmdbSearchResult[]>([]);
  const [selectedTmdbResult, setSelectedTmdbResult] = useState<TmdbSearchResult | null>(null);
  const [seasonOptions, setSeasonOptions] = useState<TmdbSeasonOption[]>([]);
  const [selectedSeasonNumbersState, setSelectedSeasonNumbers] = useState<number[]>([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [recommendedMessage, setRecommendedMessage] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [canAddSelectionToStacked, setCanAddSelectionToStacked] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);
  const isComposingRef = useRef(false);
  const itemsRef = useRef(items);

  const isTvSelection = selectedTmdbResult?.tmdbMediaType === "tv";
  const allSeasonNumbers = [1, ...seasonOptions.map((season) => season.seasonNumber)];
  const stackedSeasonNumbers =
    selectedTmdbResult?.tmdbMediaType === "tv"
      ? getStackedSeasonNumbers(items, selectedTmdbResult, allSeasonNumbers)
      : [];
  const selectedSeasonNumbers = [
    ...new Set([...selectedSeasonNumbersState, ...stackedSeasonNumbers]),
  ].sort((left, right) => left - right);
  const canToggleAllSeasons =
    isTvSelection &&
    allSeasonNumbers.some((seasonNumber) => !stackedSeasonNumbers.includes(seasonNumber));
  const hasAllSeasonsSelected =
    isTvSelection &&
    selectedSeasonNumbers.length > 0 &&
    selectedSeasonNumbers.length === allSeasonNumbers.length;
  const selectedSeasonSummary =
    selectedSeasonNumbers.length === 0
      ? "シーズン未選択"
      : selectedSeasonNumbers.length <= 3
        ? selectedSeasonNumbers.map((seasonNumber) => `シーズン${seasonNumber}`).join("・")
        : `${selectedSeasonNumbers.length}シーズン選択`;

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    searchInputRef.current?.focus();
    fetchTmdbRecommendations(buildRecommendationSourceItems(itemsRef.current))
      .then((results) => {
        const visibleResults = filterVisibleRecommendations(itemsRef.current, results);
        setRecommendedResults(visibleResults);
        if (visibleResults.length === 0) {
          setRecommendedMessage("おすすめ候補が見つかりませんでした。作品名で検索できます。");
        } else {
          setRecommendedMessage(null);
        }
      })
      .catch(() => {
        setRecommendedMessage("おすすめ候補の取得に失敗しました。作品名で検索できます。");
      });
    return () => {
      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const resetSearchState = () => {
    searchRequestIdRef.current += 1;
    setSearchResults([]);
    setSelectedTmdbResult(null);
    setSeasonOptions([]);
    setSelectedSeasonNumbers([]);
    setIsLoadingSeasons(false);
    setSearchMessage(null);
    setDuplicateNotice(null);
    setCanAddSelectionToStacked(true);
  };

  const queueSearch = (query: string) => {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      void runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    if (!trimmed) {
      resetSearchState();
      return;
    }

    resetSearchState();
    const requestId = searchRequestIdRef.current;

    try {
      const results = await searchTmdbWorks(trimmed);
      if (requestId !== searchRequestIdRef.current) return;
      const visibleResults = filterVisibleResults(items, results);
      setSearchResults(visibleResults);
      setSearchMessage(
        visibleResults.length > 0
          ? null
          : results.length > 0
            ? "すでにストック済みの作品は候補から除外しています。"
            : "候補が見つかりませんでした。このまま入力して追加できます。",
      );
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return;
      setSearchMessage(
        error instanceof Error ? `検索に失敗しました: ${error.message}` : "検索に失敗しました。",
      );
    }
  };

  const handleSelectResult = async (result: TmdbSearchResult) => {
    setSelectedTmdbResult(result);
    setSeasonOptions([]);
    setSearchMessage(null);

    if (result.tmdbMediaType !== "tv") {
      setIsLoadingSeasons(false);
      setSelectedSeasonNumbers([]);
      const duplicateState = buildDuplicateState(items, result);
      setDuplicateNotice(duplicateState.notice);
      setCanAddSelectionToStacked(duplicateState.canAddToStacked);
      return;
    }

    const nextSelectedSeasonNumbers = getStackedSeasonNumbers(items, result, [1]).includes(1)
      ? []
      : [1];
    setSelectedSeasonNumbers(nextSelectedSeasonNumbers);
    const duplicateState = buildDuplicateState(items, result, [1]);
    setDuplicateNotice(duplicateState.notice);
    setCanAddSelectionToStacked(duplicateState.canAddToStacked);

    setIsLoadingSeasons(true);
    try {
      const options = await fetchTmdbSeasonOptions(result);
      setSeasonOptions(options);
      setIsLoadingSeasons(false);
    } catch (error) {
      setIsLoadingSeasons(false);
      setSearchMessage(
        error instanceof Error
          ? `シーズン一覧の取得に失敗しました: ${error.message}`
          : "シーズン一覧の取得に失敗しました。",
      );
    }
  };

  const toggleSeasonSelection = (seasonNumber: number) => {
    if (!selectedTmdbResult || selectedTmdbResult.tmdbMediaType !== "tv") return;
    if (stackedSeasonNumbers.includes(seasonNumber)) return;

    const nextSelectedSeasonNumbers = selectedSeasonNumbersState.includes(seasonNumber)
      ? selectedSeasonNumbersState.filter((value) => value !== seasonNumber)
      : [...selectedSeasonNumbersState, seasonNumber].sort((left, right) => left - right);
    const next = [...new Set([...nextSelectedSeasonNumbers, ...stackedSeasonNumbers])].sort(
      (left, right) => left - right,
    );
    setSelectedSeasonNumbers(nextSelectedSeasonNumbers);
    const duplicateState = buildDuplicateState(items, selectedTmdbResult, next);
    setDuplicateNotice(duplicateState.notice);
    setCanAddSelectionToStacked(duplicateState.canAddToStacked);
  };

  const toggleAllSeasons = () => {
    if (!selectedTmdbResult || selectedTmdbResult.tmdbMediaType !== "tv") return;
    if (!canToggleAllSeasons) return;

    const toggleableSeasonNumbers = allSeasonNumbers.filter(
      (seasonNumber) => !stackedSeasonNumbers.includes(seasonNumber),
    );
    const hasAllToggleableSeasonsSelected = toggleableSeasonNumbers.every((seasonNumber) =>
      selectedSeasonNumbersState.includes(seasonNumber),
    );
    const nextSelectedSeasonNumbers = hasAllToggleableSeasonsSelected
      ? []
      : toggleableSeasonNumbers;
    const next = [...new Set([...nextSelectedSeasonNumbers, ...stackedSeasonNumbers])].sort(
      (left, right) => left - right,
    );
    setSelectedSeasonNumbers(nextSelectedSeasonNumbers);
    const duplicateState = buildDuplicateState(items, selectedTmdbResult, next);
    setDuplicateNotice(duplicateState.notice);
    setCanAddSelectionToStacked(duplicateState.canAddToStacked);
  };

  const handleQueryChange = (query: string) => {
    setSearchQuery(query);
    if (!isComposingRef.current) {
      if (query.trim()) {
        queueSearch(query);
      } else {
        resetSearchState();
      }
    }
  };

  const handleCompositionEnd = (query: string) => {
    isComposingRef.current = false;
    setSearchQuery(query);
    if (query.trim()) {
      queueSearch(query);
    } else {
      resetSearchState();
    }
  };

  return {
    searchQuery,
    searchResults,
    recommendedResults,
    recommendedMessage,
    selectedTmdbResult,
    seasonOptions,
    selectedSeasonNumbers,
    stackedSeasonNumbers,
    isLoadingSeasons,
    searchMessage,
    duplicateNotice,
    canAddSelectionToStacked,
    isTvSelection,
    allSeasonNumbers,
    canToggleAllSeasons,
    hasAllSeasonsSelected,
    selectedSeasonSummary,
    searchInputRef,
    isComposingRef,
    handleQueryChange,
    handleCompositionEnd,
    handleSelectResult,
    toggleSeasonSelection,
    toggleAllSeasons,
  };
}
