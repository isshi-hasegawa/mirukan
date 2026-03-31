import { useEffect, useRef, useState } from "react";
import { fetchTmdbSeasonOptions, fetchTmdbTrending, searchTmdbWorks } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import type { BacklogItem } from "../types.ts";
import { statusLabels } from "../constants.ts";

function buildDuplicateNotice(
  items: BacklogItem[],
  result: TmdbSearchResult,
  seasonNumbers: number[] = [],
): string | null {
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

  if (matches.length === 0) return null;

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
    const seasonLabel = duplicatedSeasons
      .map((seasonNumber) => `シーズン${seasonNumber}`)
      .join("・");
    return canRestoreToStacked
      ? `${seasonLabel}はすでに「${unique.join("・")}」にあります。追加するとストックに戻せます。`
      : `${seasonLabel}はすでにストックにあります。`;
  }

  return canRestoreToStacked
    ? `すでに「${unique.join("・")}」にあります。追加するとストックに戻せます。`
    : "すでにストックにあります。";
}

const SEARCH_DEBOUNCE_MS = 250;

type UseTmdbSearchOptions = {
  items: BacklogItem[];
};

export function useTmdbSearch({ items }: UseTmdbSearchOptions) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [selectedTmdbResult, setSelectedTmdbResult] = useState<TmdbSearchResult | null>(null);
  const [seasonOptions, setSeasonOptions] = useState<TmdbSeasonOption[]>([]);
  const [selectedSeasonNumbers, setSelectedSeasonNumbers] = useState<number[]>([]);
  const [trendingResults, setTrendingResults] = useState<TmdbSearchResult[]>([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);
  const isComposingRef = useRef(false);

  const isTvSelection = selectedTmdbResult?.tmdbMediaType === "tv";
  const allSeasonNumbers = [1, ...seasonOptions.map((season) => season.seasonNumber)];
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
    searchInputRef.current?.focus();
    fetchTmdbTrending()
      .then((results) => {
        setTrendingResults(results);
      })
      .catch(() => {
        // trending fetch failure is non-critical
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
      setSearchResults(results);
      setSearchMessage(
        results.length > 0 ? null : "候補が見つかりませんでした。このまま入力して追加できます。",
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
      setDuplicateNotice(buildDuplicateNotice(items, result));
      return;
    }

    setSelectedSeasonNumbers([1]);
    setDuplicateNotice(buildDuplicateNotice(items, result, [1]));

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

    const next = selectedSeasonNumbers.includes(seasonNumber)
      ? selectedSeasonNumbers.filter((value) => value !== seasonNumber)
      : [...selectedSeasonNumbers, seasonNumber].sort((left, right) => left - right);
    setSelectedSeasonNumbers(next);
    setDuplicateNotice(buildDuplicateNotice(items, selectedTmdbResult, next));
  };

  const toggleAllSeasons = () => {
    if (!selectedTmdbResult || selectedTmdbResult.tmdbMediaType !== "tv") return;

    const next =
      selectedSeasonNumbers.length === allSeasonNumbers.length ? [] : [...allSeasonNumbers];
    setSelectedSeasonNumbers(next);
    setDuplicateNotice(buildDuplicateNotice(items, selectedTmdbResult, next));
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
    trendingResults,
    selectedTmdbResult,
    seasonOptions,
    selectedSeasonNumbers,
    isLoadingSeasons,
    searchMessage,
    duplicateNotice,
    isTvSelection,
    allSeasonNumbers,
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
