import { useEffect, useReducer, useRef, useState } from "react";
import { fetchTmdbRecommendations, searchTmdbWorks } from "../../../lib/tmdb.ts";
import { initialTmdbSearchRequestState, tmdbSearchRequestReducer } from "../tmdb-search-request.ts";
import {
  buildRecommendationSourceItems,
  filterVisibleRecommendations,
  filterVisibleResults,
  prioritizeLocalizedResults,
  resolveSearchMessage,
} from "../tmdb-search-results.ts";
import type { BacklogItem } from "../types.ts";

const SEARCH_DEBOUNCE_MS = 250;

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
      const searchMessage = resolveSearchMessage(results, visibleResults);
      dispatchRequest({ type: "set_search_results", results: visibleResults });
      onSetSearchMessage(searchMessage);
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
      runSearch(query).catch(() => {});
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
