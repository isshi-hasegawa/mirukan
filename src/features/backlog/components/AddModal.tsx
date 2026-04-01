import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useTmdbSearch } from "../hooks/useTmdbSearch.ts";
import { useAddSubmit } from "../hooks/useAddSubmit.ts";
import type { BacklogItem } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";
import { AddModalDetailsPane } from "./AddModalDetailsPane.tsx";
import { AddModalSearchPane } from "./AddModalSearchPane.tsx";

type Props = {
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => Promise<void>;
  feedback?: BacklogFeedback;
};

export function AddModal({
  items,
  session,
  onClose,
  onAdded,
  feedback = browserBacklogFeedback,
}: Props) {
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [note, setNote] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [workType, setWorkType] = useState<"movie" | "series">("movie");

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
    handleQueryChange,
    handleCompositionEnd,
    handleSelectResult: selectResult,
    toggleSeasonSelection,
    toggleAllSeasons,
  } = useTmdbSearch({ items });

  const resolvedTitle = selectedTmdbResult?.title ?? manualTitle;
  const resolvedWorkType = selectedTmdbResult?.workType ?? workType;
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
    primaryPlatform,
    note,
    onClose,
    onAdded,
    feedback,
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSelectResult = (result: Parameters<typeof selectResult>[0]) => {
    clearFormMessage();
    void selectResult(result);
  };

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center p-5 bg-[rgba(51,34,23,0.4)] backdrop-blur-[10px]"
      id="add-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="w-[min(calc(100%-48px),960px)] h-[min(88svh,920px)] border border-border rounded-[28px] bg-[#2a2a2a] shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6 flex flex-col overflow-hidden max-[720px]:w-[min(100%,560px)] max-[720px]:p-5 max-[720px]:rounded-[22px] max-[720px]:h-[min(88svh,920px)]"
        role="dialog"
        aria-modal="true"
        aria-label="作品を追加"
      >
        <form
          className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-x-6 flex-1 min-h-0 overflow-hidden overflow-y-auto max-[720px]:grid-cols-1 max-[720px]:gap-y-5 max-[720px]:overflow-x-hidden"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <AddModalSearchPane
            searchInputRef={searchInputRef}
            isComposingRef={isComposingRef}
            searchQuery={searchQuery}
            recommendedResults={recommendedResults}
            searchResults={searchResults}
            recommendedMessage={recommendedMessage}
            searchMessage={searchMessage}
            selectedTmdbResult={selectedTmdbResult}
            seasonOptions={seasonOptions}
            selectedSeasonNumbers={selectedSeasonNumbers}
            stackedSeasonNumbers={stackedSeasonNumbers}
            isLoadingSeasons={isLoadingSeasons}
            duplicateNotice={duplicateNotice}
            formMessage={formMessage}
            isTvSelection={isTvSelection}
            canToggleAllSeasons={canToggleAllSeasons}
            hasAllSeasonsSelected={hasAllSeasonsSelected}
            selectedSeasonSummary={selectedSeasonSummary}
            isSelectedTmdbSubmitDisabled={isSelectedTmdbSubmitDisabled}
            selectedTmdbSubmitLabel={selectedTmdbSubmitLabel}
            onQueryChange={handleQueryChange}
            onCompositionEnd={handleCompositionEnd}
            onSelectResult={handleSelectResult}
            onToggleSeason={toggleSeasonSelection}
            onToggleAllSeasons={toggleAllSeasons}
          />

          <AddModalDetailsPane
            selectedTmdbResult={selectedTmdbResult}
            resolvedTitle={resolvedTitle}
            resolvedWorkType={resolvedWorkType}
            note={note}
            primaryPlatform={primaryPlatform}
            formMessage={formMessage}
            onChangeTitle={setManualTitle}
            onChangeWorkType={setWorkType}
            onChangePrimaryPlatform={setPrimaryPlatform}
            onChangeNote={setNote}
          />
        </form>
      </section>
    </div>
  );
}
