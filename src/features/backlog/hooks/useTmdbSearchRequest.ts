import { useEffect, useReducer, useRef, useState } from "react";
import { fetchTmdbRecommendations, searchTmdbWorks } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { initialTmdbSearchRequestState, tmdbSearchRequestReducer } from "../tmdb-search-request.ts";
import { getStackedSeasonNumbers } from "../tmdb-search-state.ts";
import type { BacklogItem } from "../types.ts";

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
      return scoreDiff === 0 ? left.index - right.index : scoreDiff;
    })
    .map(({ result }) => result);
}

const MAX_RECOMMENDATION_SOURCE_ITEMS = 8;
const SEARCH_DEBOUNCE_MS = 250;

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
}

function buildRecommendationSourceItems(items: BacklogItem[]) {
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

type UseTmdbSearchRequestOptions = {
  items: BacklogItem[];
  onResetSelection: () => void;
  onSetSearchMessage: (message: string | null) => void;
};

export function useTmdbSearchRequest({
  items,
  onResetSelection,
  onSetSearchMessage,
}: UseTmdbSearchRequestOptions) {
  const [searchQuery, setSearchQuery] = useState("");
  const [requestState, dispatchRequest] = useReducer(
    tmdbSearchRequestReducer,
    initialTmdbSearchRequestState,
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);
  const isComposingRef = useRef(false);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    searchInputRef.current?.focus();
    fetchTmdbRecommendations(buildRecommendationSourceItems(itemsRef.current))
      .then((results) => {
        const visibleResults = filterVisibleRecommendations(itemsRef.current, results);
        dispatchRequest({
          type: "set_recommendations",
          results: visibleResults,
          message:
            visibleResults.length === 0
              ? "おすすめ候補が見つかりませんでした。作品名で検索できます。"
              : null,
        });
      })
      .catch(() => {
        dispatchRequest({
          type: "set_recommendations",
          results: [],
          message: "おすすめ候補の取得に失敗しました。作品名で検索できます。",
        });
      });

    return () => {
      if (searchTimerRef.current !== null) {
        globalThis.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  const resetSearchState = () => {
    searchRequestIdRef.current += 1;
    dispatchRequest({ type: "reset_search_results" });
    onResetSelection();
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (searchTimerRef.current !== null) {
      globalThis.clearTimeout(searchTimerRef.current);
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
      dispatchRequest({ type: "set_search_results", results: visibleResults });
      onSetSearchMessage(
        visibleResults.length > 0
          ? null
          : results.length > 0
            ? "すでにストック済みの作品は候補から除外しています。"
            : "候補が見つかりませんでした。このまま入力して追加できます。",
      );
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return;
      onSetSearchMessage(
        error instanceof Error ? `検索に失敗しました: ${error.message}` : "検索に失敗しました。",
      );
    }
  };

  const queueSearch = (query: string) => {
    if (searchTimerRef.current !== null) {
      globalThis.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = globalThis.setTimeout(() => {
      void runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
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
    searchResults: requestState.searchResults,
    recommendedResults: requestState.recommendedResults,
    recommendedMessage: requestState.recommendedMessage,
    searchInputRef,
    isComposingRef,
    handleQueryChange,
    handleCompositionEnd,
  };
}
