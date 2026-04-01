import { useReducer } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  addFlowDraftReducer,
  initialAddFlowDraftState,
  resolveAddFlowDraft,
} from "../add-flow-state.ts";
import type { BacklogItem } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";
import { useAddSubmit } from "./useAddSubmit.ts";
import { useTmdbSearch } from "./useTmdbSearch.ts";

type UseAddFlowOptions = {
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => Promise<void>;
  feedback?: BacklogFeedback;
};

export function useAddFlow({
  items,
  session,
  onClose,
  onAdded,
  feedback = browserBacklogFeedback,
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

  const { formMessage, clearFormMessage, handleSubmit } = useAddSubmit({
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
    feedback,
  });

  const handleQueryChange = (query: string) => {
    clearFormMessage();
    handleTmdbQueryChange(query);
  };

  const handleCompositionEnd = (query: string) => {
    clearFormMessage();
    handleTmdbCompositionEnd(query);
  };

  const handleSelectResult = (result: NonNullable<typeof selectedTmdbResult>) => {
    clearFormMessage();
    void handleTmdbSelectResult(result);
  };

  const toggleSeasonSelection = (seasonNumber: number) => {
    clearFormMessage();
    toggleTmdbSeasonSelection(seasonNumber);
  };

  const toggleAllSeasons = () => {
    clearFormMessage();
    toggleTmdbAllSeasons();
  };

  const setManualTitle = (manualTitle: string) => {
    clearFormMessage();
    dispatchDraft({ type: "set_manual_title", manualTitle });
  };

  const setWorkType = (workType: typeof draftState.workType) => {
    clearFormMessage();
    dispatchDraft({ type: "set_work_type", workType });
  };

  const setPrimaryPlatform = (primaryPlatform: string) => {
    clearFormMessage();
    dispatchDraft({ type: "set_primary_platform", primaryPlatform });
  };

  const setNote = (note: string) => {
    clearFormMessage();
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
    isSelectedTmdbSubmitDisabled,
    selectedTmdbSubmitLabel,
    setManualTitle,
    setWorkType,
    setPrimaryPlatform,
    setNote,
    handleSubmit,
  };
}
