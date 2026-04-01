import { useReducer } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  addFlowDraftReducer,
  initialAddFlowDraftState,
  resolveAddFlowDraft,
} from "../add-flow-state.ts";
import type { BacklogItem } from "../types.ts";
import { useAddSubmit } from "./useAddSubmit.ts";
import { useTmdbSearch } from "./useTmdbSearch.ts";

type UseAddFlowOptions = {
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => Promise<void>;
};

export function useAddFlow({
  items,
  session,
  onClose,
  onAdded,
}: UseAddFlowOptions) {
  const [draftState, dispatchDraft] = useReducer(addFlowDraftReducer, initialAddFlowDraftState);
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
    duplicateNotice,
    canAddSelectionToStacked,
    isTvSelection,
    canToggleAllSeasons,
    hasAllSeasonsSelected,
    selectedSeasonSummary,
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
    dispatchDraft({ type: "set_manual_title", manualTitle });
  };

  const setWorkType = (workType: typeof draftState.workType) => {
    clearSubmissionState();
    dispatchDraft({ type: "set_work_type", workType });
  };

  const setPrimaryPlatform = (primaryPlatform: string) => {
    clearSubmissionState();
    dispatchDraft({ type: "set_primary_platform", primaryPlatform });
  };

  const setNote = (note: string) => {
    clearSubmissionState();
    dispatchDraft({ type: "set_note", note });
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
    isTvSelection,
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
