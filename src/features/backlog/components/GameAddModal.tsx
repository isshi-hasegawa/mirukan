import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { IgdbSearchResult } from "../../../lib/igdb.ts";
import { searchIgdbWorks } from "../../../lib/igdb.ts";
import type { BacklogItem, GamePlatform } from "../types.ts";
import { useAddSubmit } from "../hooks/useAddSubmit.ts";
import { GameAddModalDetailsPane } from "./GameAddModalDetailsPane.tsx";
import { GameWorkCard } from "./GameWorkCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

type Props = Readonly<{
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
}>;

const SEARCH_DEBOUNCE_MS = 250;

function filterVisibleResults(items: BacklogItem[], results: IgdbSearchResult[]) {
  return results.filter(
    (result) =>
      !items.some(
        (item) =>
          item.status === "stacked" &&
          item.works?.source_type === "igdb" &&
          item.works.igdb_id === result.igdbId,
      ),
  );
}

function resolveSearchMessage(results: IgdbSearchResult[], visibleResults: IgdbSearchResult[]) {
  if (visibleResults.length > 0) {
    return null;
  }

  if (results.length > 0) {
    return "すでに積みゲー済みの作品は候補から除外しています。";
  }

  return "候補が見つかりませんでした。このまま入力して追加できます。";
}

export function GameAddModal({ items, session, onClose, onAdded }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IgdbSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(
    "ゲームタイトルで検索できます。入力のみでも追加できます。",
  );
  const [selectedIgdbResult, setSelectedIgdbResult] = useState<IgdbSearchResult | null>(null);
  const [manualTitle, setManualTitle] = useState("");
  const [selectedTitleOverride, setSelectedTitleOverride] = useState("");
  const [gamePlatform, setGamePlatform] = useState<GamePlatform | null>(null);
  const [note, setNote] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const searchTimerRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);

  const resolvedTitle = selectedIgdbResult
    ? selectedTitleOverride || selectedIgdbResult.title
    : manualTitle;

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
    selectedTmdbResult: null,
    selectedIgdbResult,
    selectedSeasonNumbers: [],
    seasonOptions: [],
    isTvSelection: false,
    resolvedTitle,
    resolvedWorkType: "game",
    primaryPlatform: gamePlatform,
    note,
    onClose,
    onAdded,
  });

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (searchTimerRef.current !== null) {
        globalThis.clearTimeout(searchTimerRef.current);
      }
    };
  }, [onClose]);

  const resetSearchState = () => {
    searchRequestIdRef.current += 1;
    setSearchResults([]);
    setSelectedIgdbResult(null);
    setSearchMessage("ゲームタイトルで検索できます。入力のみでも追加できます。");
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();

    if (!trimmed) {
      resetSearchState();
      return;
    }

    searchRequestIdRef.current += 1;
    const requestId = searchRequestIdRef.current;

    try {
      const results = await searchIgdbWorks(trimmed);
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      const visibleResults = filterVisibleResults(items, results);
      setSearchResults(visibleResults);
      setSearchMessage(resolveSearchMessage(results, visibleResults));
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      setSearchResults([]);
      setSearchMessage(
        error instanceof Error ? `検索に失敗しました: ${error.message}` : "検索に失敗しました。",
      );
    }
  };

  const queueSearch = (query: string) => {
    if (searchTimerRef.current !== null) {
      globalThis.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = globalThis.setTimeout(() => {
      void runSearch(query);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleQueryChange = (query: string) => {
    clearSubmissionState();
    setSearchQuery(query);

    if (!isComposingRef.current) {
      if (query.trim()) {
        setSelectedIgdbResult(null);
        setSelectedTitleOverride("");
        queueSearch(query);
      } else {
        if (searchTimerRef.current !== null) {
          globalThis.clearTimeout(searchTimerRef.current);
          searchTimerRef.current = null;
        }
        resetSearchState();
      }
    }
  };

  const handleSelectResult = (result: IgdbSearchResult) => {
    clearSubmissionState();
    setSelectedTitleOverride("");
    setSelectedIgdbResult(result);
  };

  const searchResultCards = searchResults.map((result) => {
    const isSelected = selectedIgdbResult?.igdbId === result.igdbId;
    const useInlineFooter = isSelected && !formMessage && !pendingSaveMessage;
    let cardFooter: ReactNode = null;
    if (isSelected) {
      if (useInlineFooter) {
        cardFooter = <Button type="submit">積みゲーに追加</Button>;
      } else if (pendingSaveMessage) {
        cardFooter = (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground">{pendingSaveMessage}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelPendingSave}>
                キャンセル
              </Button>
              <Button type="button" onClick={() => void confirmPendingSave()}>
                積みゲーへ戻す
              </Button>
            </div>
          </div>
        );
      } else {
        cardFooter = (
          <div className="flex items-end justify-end gap-3">
            {formMessage ? (
              <p className="text-muted-foreground text-sm text-right" aria-live="polite">
                {formMessage}
              </p>
            ) : null}
            <Button type="submit">積みゲーに追加</Button>
          </div>
        );
      }
    }
    return (
      <GameWorkCard
        key={result.igdbId}
        result={result}
        isSelected={isSelected}
        onSelect={() => handleSelectResult(result)}
        footerLayout={useInlineFooter ? "inline" : "panel"}
        footer={cardFooter}
      />
    );
  });

  const emptySearchContent = searchMessage ? (
    <p className="text-muted-foreground text-[0.88rem]">{searchMessage}</p>
  ) : null;

  return (
    <div className="fixed inset-0 z-10 grid place-items-center p-5 bg-[rgba(51,34,23,0.4)] backdrop-blur-[10px]">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />
      <dialog
        open
        className="relative z-10 w-[min(calc(100%_-_48px),960px)] h-[min(88svh,920px)] border border-border rounded-[28px] bg-[#2a2a2a] shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6 flex flex-col overflow-hidden max-[720px]:w-full max-[720px]:max-w-[560px] max-[720px]:p-5 max-[720px]:rounded-[22px] max-[720px]:h-[min(88svh,920px)]"
        aria-modal="true"
        aria-label="ゲームを追加"
      >
        <form
          className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-x-6 flex-1 min-h-0 min-w-0 overflow-hidden overflow-y-auto max-[720px]:grid-cols-1 max-[720px]:gap-y-5 max-[720px]:overflow-x-hidden"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <div className="grid w-full min-w-0 gap-3.5 p-4 overflow-y-auto content-start rounded-[20px] bg-[rgba(191,90,54,0.06)] max-[720px]:p-3 max-[720px]:overflow-y-visible">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="ゲームタイトルで検索"
              value={searchQuery}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                isComposingRef.current = false;
                handleQueryChange(e.currentTarget.value);
              }}
              onChange={(e) => handleQueryChange(e.target.value)}
            />

            <div className="modal-scrollable grid w-full min-w-0 gap-2.5 overflow-y-auto max-[720px]:h-[min(56svh,480px)]">
              {searchResultCards.length > 0 ? searchResultCards : emptySearchContent}
            </div>
          </div>

          <GameAddModalDetailsPane
            resolvedTitle={resolvedTitle}
            gamePlatform={gamePlatform}
            note={note}
            formMessage={formMessage}
            pendingSaveMessage={pendingSaveMessage}
            onChangeTitle={(title) => {
              clearSubmissionState();
              if (selectedIgdbResult) {
                setSelectedTitleOverride(title);
              } else {
                setManualTitle(title);
              }
            }}
            onChangeGamePlatform={(platform) => {
              clearSubmissionState();
              setGamePlatform(platform);
            }}
            onChangeNote={(nextNote) => {
              clearSubmissionState();
              setNote(nextNote);
            }}
            onConfirmPendingSave={() => void confirmPendingSave()}
            onCancelPendingSave={cancelPendingSave}
          />
        </form>
      </dialog>
    </div>
  );
}
