import { useEffect, useReducer, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { suggestDisplayTitle } from "../../../lib/tmdb.ts";
import {
  addFlowDraftReducer,
  initialAddFlowDraftState,
  resolveAddFlowDraft,
} from "../add-flow-state.ts";
import type { BacklogItem, PrimaryPlatform } from "../types.ts";
import { useAddSubmit } from "./useAddSubmit.ts";
import { useTmdbSearch } from "./useTmdbSearch.ts";

function hasJapaneseText(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

type UseAddFlowOptions = {
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
};

export function useAddFlow({ items, session, onClose, onAdded }: UseAddFlowOptions) {
  const [draftState, dispatchDraft] = useReducer(addFlowDraftReducer, initialAddFlowDraftState);
  const titleSuggestionRequestIdRef = useRef(0);
  const {
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
    canAddSelectionToStacked,
    isTvSelection,
    canToggleAllSeasons,
    hasAllSeasonsSelected,
    searchInputRef,
    isComposingRef,
    handleQueryChange: handleTmdbQueryChange,
    handleCompositionEnd: handleTmdbCompositionEnd,
    handleSelectResult: handleTmdbSelectResult,
    toggleSeasonSelection: toggleTmdbSeasonSelection,
    toggleAllSeasons: toggleTmdbAllSeasons,
  } = useTmdbSearch({ items });
  const { resolvedTitle, resolvedWorkType } = resolveAddFlowDraft(draftState, selectedTmdbResult);
  const isSelectedTmdbSubmitDisabled =
    !!selectedTmdbResult &&
    ((isTvSelection && selectedSeasonNumbers.length === 0) || !canAddSelectionToStacked);
  const selectedTmdbSubmitLabel = canAddSelectionToStacked ? "ストックに追加" : "ストック済み";

  const {
    formMessage,
    pendingSaveMessage,
    clearSubmissionState,
    confirmPendingSave,
    cancelPendingSave,
    handleSubmit,
  } = useAddSubmit({
    items,
    session,
    selectedTmdbResult,
    selectedSeasonNumbers,
    seasonOptions,
    isTvSelection,
    resolvedTitle,
    resolvedWorkType,
    primaryPlatform: draftState.primaryPlatform,
    note: draftState.note,
    onClose,
    onAdded,
  });

  const handleQueryChange = (query: string) => {
    clearSubmissionState();
    handleTmdbQueryChange(query);
  };

  const handleCompositionEnd = (query: string) => {
    clearSubmissionState();
    handleTmdbCompositionEnd(query);
  };

  const handleSelectResult = (result: NonNullable<typeof selectedTmdbResult>) => {
    clearSubmissionState();
    dispatchDraft({ type: "set_selected_title_override", selectedTitleOverride: "" });
    void handleTmdbSelectResult(result);
  };

  const toggleSeasonSelection = (seasonNumber: number) => {
    clearSubmissionState();
    toggleTmdbSeasonSelection(seasonNumber);
  };

  const toggleAllSeasons = () => {
    clearSubmissionState();
    toggleTmdbAllSeasons();
  };

  const setManualTitle = (manualTitle: string) => {
    clearSubmissionState();
    dispatchDraft(
      selectedTmdbResult
        ? { type: "set_selected_title_override", selectedTitleOverride: manualTitle }
        : { type: "set_manual_title", manualTitle },
    );
  };

  const setWorkType = (workType: typeof draftState.workType) => {
    clearSubmissionState();
    dispatchDraft({ type: "set_work_type", workType });
  };

  const setPrimaryPlatform = (primaryPlatform: PrimaryPlatform) => {
    clearSubmissionState();
    dispatchDraft({ type: "set_primary_platform", primaryPlatform });
  };

  const setNote = (note: string) => {
    clearSubmissionState();
    dispatchDraft({ type: "set_note", note });
  };

  useEffect(() => {
    titleSuggestionRequestIdRef.current += 1;
    const requestId = titleSuggestionRequestIdRef.current;

    if (
      !selectedTmdbResult ||
      hasJapaneseText(selectedTmdbResult.title) ||
      (selectedTmdbResult.originalTitle &&
        selectedTmdbResult.originalTitle.trim() !== selectedTmdbResult.title.trim())
    ) {
      return;
    }

    void suggestDisplayTitle({
      title: selectedTmdbResult.title,
      originalTitle: selectedTmdbResult.originalTitle,
      workType: selectedTmdbResult.workType,
    })
      .then((suggestedTitle) => {
        if (
          requestId !== titleSuggestionRequestIdRef.current ||
          !suggestedTitle ||
          draftState.selectedTitleOverride.trim()
        ) {
          return;
        }

        dispatchDraft({
          type: "set_selected_title_override",
          selectedTitleOverride: suggestedTitle,
        });
      })
      .catch(() => {});
  }, [draftState.selectedTitleOverride, selectedTmdbResult]);

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
    isTvSelection,
    canToggleAllSeasons,
    hasAllSeasonsSelected,
    searchInputRef,
    isComposingRef,
    handleQueryChange,
    handleCompositionEnd,
    handleSelectResult,
    toggleSeasonSelection,
    toggleAllSeasons,
    resolvedTitle,
    resolvedWorkType,
    primaryPlatform: draftState.primaryPlatform,
    note: draftState.note,
    formMessage,
    pendingSaveMessage,
    isSelectedTmdbSubmitDisabled,
    selectedTmdbSubmitLabel,
    setManualTitle,
    setWorkType,
    setPrimaryPlatform,
    setNote,
    confirmPendingSave,
    cancelPendingSave,
    handleSubmit,
  };
}
