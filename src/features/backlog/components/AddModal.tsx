import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import type { BacklogItem } from "../types.ts";
import { useAddFlow } from "../hooks/useAddFlow.ts";
import { AddModalDetailsPane } from "./AddModalDetailsPane.tsx";
import { AddModalSearchPane } from "./AddModalSearchPane.tsx";

type Props = {
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => Promise<void>;
};

export function AddModal({ items, session, onClose, onAdded }: Props) {
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
    primaryPlatform,
    note,
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
  } = useAddFlow({
    items,
    session,
    onClose,
    onAdded,
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
            formMessage={formMessage}
            pendingSaveMessage={pendingSaveMessage}
            isTvSelection={isTvSelection}
            canToggleAllSeasons={canToggleAllSeasons}
            hasAllSeasonsSelected={hasAllSeasonsSelected}
            isSelectedTmdbSubmitDisabled={isSelectedTmdbSubmitDisabled}
            selectedTmdbSubmitLabel={selectedTmdbSubmitLabel}
            onQueryChange={handleQueryChange}
            onCompositionEnd={handleCompositionEnd}
            onSelectResult={handleSelectResult}
            onToggleSeason={toggleSeasonSelection}
            onToggleAllSeasons={toggleAllSeasons}
            onConfirmPendingSave={() => void confirmPendingSave()}
            onCancelPendingSave={cancelPendingSave}
          />

          <AddModalDetailsPane
            selectedTmdbResult={selectedTmdbResult}
            resolvedTitle={resolvedTitle}
            resolvedWorkType={resolvedWorkType}
            note={note}
            primaryPlatform={primaryPlatform}
            formMessage={formMessage}
            pendingSaveMessage={pendingSaveMessage}
            onChangeTitle={setManualTitle}
            onChangeWorkType={setWorkType}
            onChangePrimaryPlatform={setPrimaryPlatform}
            onChangeNote={setNote}
            onConfirmPendingSave={() => void confirmPendingSave()}
            onCancelPendingSave={cancelPendingSave}
          />
        </form>
      </section>
    </div>
  );
}
