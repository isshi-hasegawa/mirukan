import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { DocumentTextIcon, FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import { TmdbWorkCard } from "./TmdbWorkCard.tsx";
import type { Session } from "@supabase/supabase-js";
import { PlatformPicker } from "./PlatformPicker.tsx";
import { SeasonPicker } from "./SeasonPicker.tsx";
import { useTmdbSearch } from "../hooks/useTmdbSearch.ts";
import { useAddSubmit } from "../hooks/useAddSubmit.ts";
import type { BacklogItem } from "../types.ts";

type Props = {
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => Promise<void>;
};

export function AddModal({ items, session, onClose, onAdded }: Props) {
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [note, setNote] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [workType, setWorkType] = useState<"movie" | "series">("movie");

  const {
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
          <div className="grid gap-3.5 p-4 overflow-y-auto content-start rounded-[20px] bg-[rgba(191,90,54,0.06)] max-[720px]:p-3 max-[720px]:overflow-y-visible">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="作品名で検索"
              value={searchQuery}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                handleCompositionEnd(e.currentTarget.value);
              }}
              onChange={(e) => {
                handleQueryChange(e.target.value);
              }}
            />

            <div className="modal-scrollable grid gap-2.5 overflow-y-auto max-[720px]:h-[min(40svh,320px)]">
              {(() => {
                const displayResults = searchQuery.trim() === "" ? trendingResults : searchResults;
                if (displayResults.length > 0) {
                  return displayResults.map((result) =>
                    (() => {
                      const isSelected = selectedTmdbResult?.tmdbId === result.tmdbId;
                      const useInlineFooter =
                        isSelected && !isTvSelection && !duplicateNotice && !formMessage;

                      return (
                        <TmdbWorkCard
                          key={`${result.tmdbMediaType}-${result.tmdbId}`}
                          result={result}
                          isSelected={isSelected}
                          onSelect={() => handleSelectResult(result)}
                          footerLayout={useInlineFooter ? "inline" : "panel"}
                          footer={
                            isSelected ? (
                              useInlineFooter ? (
                                <Button
                                  type="submit"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                  }}
                                >
                                  追加する
                                </Button>
                              ) : (
                                <div className="grid gap-2.5">
                                  {isTvSelection && (
                                    <SeasonPicker
                                      seasonOptions={seasonOptions}
                                      selectedSeasonNumbers={selectedSeasonNumbers}
                                      isLoadingSeasons={isLoadingSeasons}
                                      hasAllSeasonsSelected={hasAllSeasonsSelected}
                                      selectedSeasonSummary={selectedSeasonSummary}
                                      onToggleSeason={toggleSeasonSelection}
                                      onToggleAll={toggleAllSeasons}
                                    />
                                  )}
                                  {duplicateNotice && (
                                    <p className="text-[0.82rem] text-muted-foreground px-2 py-1 rounded-lg bg-[rgba(0,0,0,0.08)]">
                                      {duplicateNotice}
                                    </p>
                                  )}
                                  <div className="flex items-end justify-end gap-3">
                                    {formMessage && (
                                      <p
                                        className="text-muted-foreground text-sm text-right"
                                        aria-live="polite"
                                      >
                                        {formMessage}
                                      </p>
                                    )}
                                    <Button
                                      type="submit"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                      }}
                                    >
                                      追加する
                                    </Button>
                                  </div>
                                </div>
                              )
                            ) : null
                          }
                        />
                      );
                    })(),
                  );
                }
                return (
                  searchMessage && (
                    <p className="text-muted-foreground text-[0.88rem]">{searchMessage}</p>
                  )
                );
              })()}
            </div>
          </div>

          <div className="flex flex-col gap-4 overflow-y-auto max-[720px]:overflow-y-visible">
            <Input
              name="title"
              type="text"
              placeholder="タイトル"
              aria-label="タイトル"
              maxLength={120}
              value={resolvedTitle}
              readOnly={!!selectedTmdbResult}
              onChange={(e) => {
                if (!selectedTmdbResult) {
                  setManualTitle(e.target.value);
                }
              }}
              required
            />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="種別">
              {(["movie", "series"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`px-3 py-1 border rounded-[20px] text-[0.88rem] cursor-pointer transition-[background,color,border-color] duration-150${
                    resolvedWorkType === t
                      ? " bg-primary border-primary text-primary-foreground font-semibold"
                      : " border-[rgba(92,59,35,0.2)] bg-transparent text-muted-foreground hover:bg-[rgba(92,59,35,0.08)] hover:text-foreground"
                  }`}
                  disabled={!!selectedTmdbResult}
                  onClick={() => setWorkType(t)}
                >
                  {t === "movie" ? (
                    <>
                      <FilmIcon
                        className="w-4 h-4 inline-block align-middle mr-1 shrink-0"
                        aria-hidden="true"
                      />
                      映画
                    </>
                  ) : (
                    <>
                      <TvIcon
                        className="w-4 h-4 inline-block align-middle mr-1 shrink-0"
                        aria-hidden="true"
                      />
                      シリーズ
                    </>
                  )}
                </button>
              ))}
            </div>
            <p className="text-[0.88rem] text-muted-foreground">追加先はストックです。</p>
            <PlatformPicker value={primaryPlatform} onChange={setPrimaryPlatform} />
            <div className="flex items-start gap-2 w-full">
              <DocumentTextIcon className="w-5 h-5 shrink-0 stroke-[1.5] text-muted-foreground mt-0.5" />
              <textarea
                name="note"
                className="w-full p-0 border-none bg-transparent text-foreground leading-[1.6] outline-none resize-none min-h-[60px] flex-1 placeholder:text-muted-foreground"
                placeholder="メモを追加"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {!selectedTmdbResult && (
              <div className="flex justify-end items-center gap-3 pt-1">
                {formMessage && (
                  <p className="text-muted-foreground text-sm" aria-live="polite">
                    {formMessage}
                  </p>
                )}
                <Button type="submit">追加する</Button>
              </div>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
