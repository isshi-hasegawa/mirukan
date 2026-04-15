import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import type { MutableRefObject, RefObject } from "react";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { PendingSaveNotice } from "./PendingSaveNotice.tsx";
import { SeasonPicker } from "./SeasonPicker.tsx";
import { TmdbWorkCard } from "./TmdbWorkCard.tsx";

type Props = Readonly<{
  searchInputRef: RefObject<HTMLInputElement | null>;
  isComposingRef: MutableRefObject<boolean>;
  searchQuery: string;
  recommendedResults: TmdbSearchResult[];
  searchResults: TmdbSearchResult[];
  recommendedMessage: string | null;
  searchMessage: string | null;
  selectedTmdbResult: TmdbSearchResult | null;
  seasonOptions: TmdbSeasonOption[];
  selectedSeasonNumbers: number[];
  stackedSeasonNumbers: number[];
  isLoadingSeasons: boolean;
  formMessage: string;
  pendingSaveMessage: string | null;
  isTvSelection: boolean;
  canToggleAllSeasons: boolean;
  hasAllSeasonsSelected: boolean;
  isSelectedTmdbSubmitDisabled: boolean;
  selectedTmdbSubmitLabel: string;
  onQueryChange: (query: string) => void;
  onCompositionEnd: (query: string) => void;
  onSelectResult: (result: TmdbSearchResult) => void;
  onToggleSeason: (seasonNumber: number) => void;
  onToggleAllSeasons: () => void;
  onConfirmPendingSave: () => void;
  onCancelPendingSave: () => void;
}>;

type SelectedResultFooterProps = Omit<
  Props,
  | "searchInputRef"
  | "isComposingRef"
  | "searchQuery"
  | "recommendedResults"
  | "searchResults"
  | "recommendedMessage"
  | "searchMessage"
  | "selectedTmdbResult"
  | "onQueryChange"
  | "onCompositionEnd"
  | "onSelectResult"
>;

function SelectedResultFooter({
  isTvSelection,
  seasonOptions,
  selectedSeasonNumbers,
  stackedSeasonNumbers,
  isLoadingSeasons,
  canToggleAllSeasons,
  hasAllSeasonsSelected,
  formMessage,
  pendingSaveMessage,
  isSelectedTmdbSubmitDisabled,
  selectedTmdbSubmitLabel,
  onToggleSeason,
  onToggleAllSeasons,
  onConfirmPendingSave,
  onCancelPendingSave,
}: SelectedResultFooterProps) {
  return (
    <div className="grid gap-2.5">
      {isTvSelection && (
        <SeasonPicker
          seasonOptions={seasonOptions}
          selectedSeasonNumbers={selectedSeasonNumbers}
          stackedSeasonNumbers={stackedSeasonNumbers}
          isLoadingSeasons={isLoadingSeasons}
          canToggleAllSeasons={canToggleAllSeasons}
          hasAllSeasonsSelected={hasAllSeasonsSelected}
          onToggleSeason={onToggleSeason}
          onToggleAll={onToggleAllSeasons}
        />
      )}
      {pendingSaveMessage ? (
        <PendingSaveNotice
          message={pendingSaveMessage}
          onConfirm={onConfirmPendingSave}
          onCancel={onCancelPendingSave}
        />
      ) : null}
      {pendingSaveMessage ? null : (
        <div className="flex items-end justify-end gap-3">
          {formMessage && (
            <p className="text-muted-foreground text-sm text-right" aria-live="polite">
              {formMessage}
            </p>
          )}
          <Button
            type="submit"
            disabled={isSelectedTmdbSubmitDisabled}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {selectedTmdbSubmitLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AddModalSearchPane({
  searchInputRef,
  isComposingRef,
  searchQuery,
  recommendedResults,
  searchResults,
  recommendedMessage,
  searchMessage,
  selectedTmdbResult,
  seasonOptions,
  selectedSeasonNumbers,
  stackedSeasonNumbers,
  isLoadingSeasons,
  formMessage,
  pendingSaveMessage,
  isTvSelection,
  canToggleAllSeasons,
  hasAllSeasonsSelected,
  isSelectedTmdbSubmitDisabled,
  selectedTmdbSubmitLabel,
  onQueryChange,
  onCompositionEnd,
  onSelectResult,
  onToggleSeason,
  onToggleAllSeasons,
  onConfirmPendingSave,
  onCancelPendingSave,
}: Props) {
  const displayResults = searchQuery.trim() === "" ? recommendedResults : searchResults;
  const emptyMessage = searchQuery.trim() === "" ? recommendedMessage : searchMessage;

  return (
    <div className="grid w-full min-w-0 gap-3.5 p-4 overflow-y-auto content-start rounded-[20px] bg-[rgba(191,90,54,0.06)] max-[720px]:p-3 max-[720px]:overflow-y-visible">
      <Input
        ref={searchInputRef}
        type="text"
        placeholder="作品名で検索"
        value={searchQuery}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          onCompositionEnd(e.currentTarget.value);
        }}
        onChange={(e) => {
          onQueryChange(e.target.value);
        }}
      />

      <div className="modal-scrollable grid w-full min-w-0 gap-2.5 overflow-y-auto max-[720px]:h-[min(56svh,480px)]">
        {displayResults.length > 0
          ? displayResults.map((result) => {
              const isSelected = selectedTmdbResult?.tmdbId === result.tmdbId;
              const useInlineFooter =
                isSelected && !isTvSelection && !formMessage && !pendingSaveMessage;

              return (
                <TmdbWorkCard
                  key={`${result.tmdbMediaType}-${result.tmdbId}`}
                  result={result}
                  isSelected={isSelected}
                  onSelect={() => onSelectResult(result)}
                  footerLayout={useInlineFooter ? "inline" : "panel"}
                  footer={
                    isSelected ? (
                      useInlineFooter ? (
                        <Button
                          type="submit"
                          disabled={isSelectedTmdbSubmitDisabled}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          {selectedTmdbSubmitLabel}
                        </Button>
                      ) : (
                        <SelectedResultFooter
                          isTvSelection={isTvSelection}
                          seasonOptions={seasonOptions}
                          selectedSeasonNumbers={selectedSeasonNumbers}
                          stackedSeasonNumbers={stackedSeasonNumbers}
                          isLoadingSeasons={isLoadingSeasons}
                          canToggleAllSeasons={canToggleAllSeasons}
                          hasAllSeasonsSelected={hasAllSeasonsSelected}
                          formMessage={formMessage}
                          pendingSaveMessage={pendingSaveMessage}
                          isSelectedTmdbSubmitDisabled={isSelectedTmdbSubmitDisabled}
                          selectedTmdbSubmitLabel={selectedTmdbSubmitLabel}
                          onToggleSeason={onToggleSeason}
                          onToggleAllSeasons={onToggleAllSeasons}
                          onConfirmPendingSave={onConfirmPendingSave}
                          onCancelPendingSave={onCancelPendingSave}
                        />
                      )
                    ) : null
                  }
                />
              );
            })
          : emptyMessage && <p className="text-muted-foreground text-[0.88rem]">{emptyMessage}</p>}
      </div>
    </div>
  );
}
