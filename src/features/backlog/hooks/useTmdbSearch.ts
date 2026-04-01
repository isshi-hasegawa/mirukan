import { useEffect, useReducer, useRef, useState } from "react";
import {
  fetchTmdbRecommendations,
  fetchTmdbSeasonOptions,
  searchTmdbWorks,
} from "../../../lib/tmdb.ts";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import type { BacklogItem } from "../types.ts";
import {
  buildTvSelectionState,
  getStackedSeasonNumbers,
  mergeSeasonNumbers,
} from "../tmdb-search-state.ts";
import {
  initialTmdbSearchSelectionState,
  tmdbSearchSelectionReducer,
} from "../tmdb-search-selection.ts";

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

function getLocalizationScore(result: TmdbSearchResult) {
  let score = 0;

  if (!result.originalTitle || result.title.trim() !== result.originalTitle.trim()) {
    score += 2;
  }

  if (result.overview?.trim()) {
    score += 1;
  }

  return score;
}

function prioritizeLocalizedResults(results: TmdbSearchResult[]) {
  return results
    .map((result, index) => ({ result, index }))
    .sort((left, right) => {
      const scoreDiff = getLocalizationScore(right.result) - getLocalizationScore(left.result);
      return scoreDiff !== 0 ? scoreDiff : left.index - right.index;
    })
    .map(({ result }) => result);
}

const MAX_RECOMMENDATION_SOURCE_ITEMS = 8;

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
    .slice(0, MAX_RECOMMENDATION_SOURCE_ITEMS)
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

  return prioritizeLocalizedResults(
    filterVisibleResults(items, results).filter(
      (result) =>
      !itemTmdbKeys.has(`${result.tmdbMediaType}-${result.tmdbId}`) &&
        (result.workType === "series" || result.hasJapaneseRelease),
    ),
  );
}

const SEARCH_DEBOUNCE_MS = 250;

type UseTmdbSearchOptions = {
  items: BacklogItem[];
};

export function useTmdbSearch({ items }: UseTmdbSearchOptions) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [recommendedResults, setRecommendedResults] = useState<TmdbSearchResult[]>([]);
  const [recommendedMessage, setRecommendedMessage] = useState<string | null>(null);
  const [selectionState, dispatchSelection] = useReducer(
    tmdbSearchSelectionReducer,
    initialTmdbSearchSelectionState,
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);
  const isComposingRef = useRef(false);
  const itemsRef = useRef(items);
  const {
    selectedTmdbResult,
    seasonOptions,
    selectedSeasonNumbersState,
    isLoadingSeasons,
    searchMessage,
    duplicateNotice,
    canAddSelectionToStacked,
  } = selectionState;

  const isTvSelection = selectedTmdbResult?.tmdbMediaType === "tv";
  const allSeasonNumbers = [1, ...seasonOptions.map((season) => season.seasonNumber)];
  const stackedSeasonNumbers =
    selectedTmdbResult?.tmdbMediaType === "tv"
      ? getStackedSeasonNumbers(items, selectedTmdbResult, allSeasonNumbers)
      : [];
  const selectedSeasonNumbers = mergeSeasonNumbers(
    selectedSeasonNumbersState,
    stackedSeasonNumbers,
  );
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
    dispatchSelection({ type: "reset" });
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
      const visibleResults = prioritizeLocalizedResults(filterVisibleResults(items, results));
      setSearchResults(visibleResults);
      dispatchSelection({
        type: "set_search_message",
        message:
          visibleResults.length > 0
            ? null
            : results.length > 0
              ? "すでにストック済みの作品は候補から除外しています。"
              : "候補が見つかりませんでした。このまま入力して追加できます。",
      });
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return;
      dispatchSelection({
        type: "set_search_message",
        message:
          error instanceof Error ? `検索に失敗しました: ${error.message}` : "検索に失敗しました。",
      });
    }
  };

  const handleSelectResult = async (result: TmdbSearchResult) => {
    if (result.tmdbMediaType !== "tv") {
      const nextState = buildTvSelectionState(items, result, []);
      dispatchSelection({
        type: "select_result",
        result,
        selectedSeasonNumbersState: [],
        duplicateNotice: nextState.duplicateNotice,
        canAddSelectionToStacked: nextState.canAddSelectionToStacked,
        isLoadingSeasons: false,
      });
      return;
    }

    const nextSelectedSeasonNumbers = getStackedSeasonNumbers(items, result, [1]).includes(1)
      ? []
      : [1];
    const nextState = buildTvSelectionState(items, result, [1]);
    dispatchSelection({
      type: "select_result",
      result,
      selectedSeasonNumbersState: nextSelectedSeasonNumbers,
      duplicateNotice: nextState.duplicateNotice,
      canAddSelectionToStacked: nextState.canAddSelectionToStacked,
      isLoadingSeasons: true,
    });

    try {
      const options = await fetchTmdbSeasonOptions(result);
      dispatchSelection({ type: "set_season_options", seasonOptions: options });
    } catch (error) {
      dispatchSelection({
        type: "set_search_message",
        message:
          error instanceof Error
            ? `シーズン一覧の取得に失敗しました: ${error.message}`
            : "シーズン一覧の取得に失敗しました。",
      });
    }
  };

  const toggleSeasonSelection = (seasonNumber: number) => {
    if (!selectedTmdbResult || selectedTmdbResult.tmdbMediaType !== "tv") return;
    if (stackedSeasonNumbers.includes(seasonNumber)) return;

    const nextSelectedSeasonNumbers = selectedSeasonNumbersState.includes(seasonNumber)
      ? selectedSeasonNumbersState.filter((value) => value !== seasonNumber)
      : [...selectedSeasonNumbersState, seasonNumber].sort((left, right) => left - right);
    const nextState = buildTvSelectionState(
      items,
      selectedTmdbResult,
      mergeSeasonNumbers(nextSelectedSeasonNumbers, stackedSeasonNumbers),
    );
    dispatchSelection({
      type: "set_selected_seasons",
      selectedSeasonNumbersState: nextSelectedSeasonNumbers,
      duplicateNotice: nextState.duplicateNotice,
      canAddSelectionToStacked: nextState.canAddSelectionToStacked,
    });
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
    const nextState = buildTvSelectionState(
      items,
      selectedTmdbResult,
      mergeSeasonNumbers(nextSelectedSeasonNumbers, stackedSeasonNumbers),
    );
    dispatchSelection({
      type: "set_selected_seasons",
      selectedSeasonNumbersState: nextSelectedSeasonNumbers,
      duplicateNotice: nextState.duplicateNotice,
      canAddSelectionToStacked: nextState.canAddSelectionToStacked,
    });
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
