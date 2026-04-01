import { useReducer } from "react";
import { fetchTmdbSeasonOptions } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import {
  initialTmdbSearchSelectionState,
  tmdbSearchSelectionReducer,
} from "../tmdb-search-selection.ts";
import {
  buildTvSelectionState,
  getStackedSeasonNumbers,
  mergeSeasonNumbers,
} from "../tmdb-search-state.ts";
import type { BacklogItem } from "../types.ts";
import { useTmdbSearchRequest } from "./useTmdbSearchRequest.ts";

type UseTmdbSearchOptions = {
  items: BacklogItem[];
};

export function useTmdbSearch({ items }: UseTmdbSearchOptions) {
  const [selectionState, dispatchSelection] = useReducer(
    tmdbSearchSelectionReducer,
    initialTmdbSearchSelectionState,
  );
  const {
    selectedTmdbResult,
    seasonOptions,
    selectedSeasonNumbersState,
    isLoadingSeasons,
    searchMessage,
    duplicateNotice,
    canAddSelectionToStacked,
  } = selectionState;
  const {
    searchQuery,
    searchResults,
    recommendedResults,
    recommendedMessage,
    searchInputRef,
    isComposingRef,
    handleQueryChange,
    handleCompositionEnd,
  } = useTmdbSearchRequest({
    items,
    onResetSelection: () => {
      dispatchSelection({ type: "reset" });
    },
    onSetSearchMessage: (message) => {
      dispatchSelection({ type: "set_search_message", message });
    },
  });

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
