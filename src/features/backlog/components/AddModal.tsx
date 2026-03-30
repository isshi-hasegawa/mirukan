import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { DocumentTextIcon, FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import { TmdbWorkCard } from "./TmdbWorkCard.tsx";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import { fetchTmdbSeasonOptions, fetchTmdbTrending, searchTmdbWorks } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult, TmdbSelectionTarget, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { upsertTmdbWork, getNextSortOrder, addAllSeasons } from "../data.ts";
import { buildSearchText, normalizePrimaryPlatform } from "../helpers.ts";
import { statusLabels, statusOrder } from "../constants.ts";
import { PlatformPicker } from "./PlatformPicker.tsx";
import type { BacklogItem, BacklogStatus, WorkType } from "../types.ts";

const SEARCH_DEBOUNCE_MS = 250;

type Props = {
  defaultStatus: BacklogStatus;
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => Promise<void>;
  onAddToStacked?: (result: TmdbSearchResult) => Promise<string | null>;
};

export function AddModal({
  defaultStatus,
  items,
  session,
  onClose,
  onAdded,
  onAddToStacked,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [selectedTmdbResult, setSelectedTmdbResult] = useState<TmdbSearchResult | null>(null);
  const [selectedTmdbTarget, setSelectedTmdbTarget] = useState<TmdbSelectionTarget | null>(null);
  const [seasonOptions, setSeasonOptions] = useState<TmdbSeasonOption[]>([]);

  const [trendingResults, setTrendingResults] = useState<TmdbSearchResult[]>([]);

  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<BacklogStatus>(defaultStatus);
  const [primaryPlatform, setPrimaryPlatform] = useState("");
  const [note, setNote] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [workType, setWorkType] = useState<"movie" | "series">("movie");
  const [formMessage, setFormMessage] = useState("");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);
  const isComposingRef = useRef(false);

  const resolvedTitle = selectedTmdbTarget?.title ?? manualTitle;
  const resolvedWorkType =
    selectedTmdbTarget?.workType === "season"
      ? "series"
      : (selectedTmdbTarget?.workType ?? workType);

  useEffect(() => {
    searchInputRef.current?.focus();
    const itemTmdbKeys = new Set(
      items
        .filter((item) => item.works?.tmdb_id && item.works?.tmdb_media_type)
        .map((item) => `${item.works!.tmdb_media_type}-${item.works!.tmdb_id}`),
    );
    fetchTmdbTrending()
      .then((results) => {
        setTrendingResults(
          results.filter((r) => !itemTmdbKeys.has(`${r.tmdbMediaType}-${r.tmdbId}`)),
        );
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const resetSearchState = () => {
    searchRequestIdRef.current += 1;
    setSearchResults([]);
    setSelectedTmdbResult(null);
    setSelectedTmdbTarget(null);
    setSeasonOptions([]);
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

  const checkDuplicates = (target: TmdbSelectionTarget) => {
    const activeStatuses: BacklogItem["status"][] = ["watching", "interrupted", "watched"];
    const matches = items.filter((item) => {
      const w = item.works;
      if (!activeStatuses.includes(item.status)) return false;
      if (w?.tmdb_id !== target.tmdbId || w?.tmdb_media_type !== target.tmdbMediaType) return false;
      if (target.workType === "season") {
        return w?.work_type === "season" && w?.season_number === target.seasonNumber;
      }
      return w?.work_type === target.workType;
    });
    if (matches.length === 0) {
      setDuplicateNotice(null);
      return;
    }
    const labels = matches.map((item) => statusLabels[item.status]);
    const unique = [...new Set(labels)];
    setDuplicateNotice(`「${unique.join("・")}」にすでにカードがあります`);
  };

  const handleSelectResult = async (result: TmdbSearchResult) => {
    setSelectedTmdbResult(result);
    setSelectedTmdbTarget(result);
    setSeasonOptions([]);
    checkDuplicates(result);

    if (result.tmdbMediaType !== "tv") return;

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

  const handleAddAllSeasons = async () => {
    if (!selectedTmdbResult) return;

    setFormMessage("全シーズンを追加しています...");
    const result = await addAllSeasons(selectedTmdbResult, session.user.id, status, items);

    if (result.error) {
      setFormMessage(`全シーズンの追加に失敗しました: ${result.error}`);
      return;
    }

    onClose();
    await onAdded();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = resolvedTitle.trim();

    if (!title) {
      setFormMessage("タイトルを入力してください。");
      return;
    }

    setFormMessage("作品を追加しています...");

    let work: { id: string } | null = null;
    let workError: { message: string } | null = null;

    try {
      const result = selectedTmdbTarget
        ? await upsertTmdbWork(selectedTmdbTarget, session.user.id)
        : await supabase
            .from("works")
            .insert({
              created_by: session.user.id,
              source_type: "manual",
              work_type: resolvedWorkType as Extract<WorkType, "movie" | "series">,
              title,
              search_text: buildSearchText(title),
            })
            .select("id")
            .single();

      work = result.data;
      workError = result.error ? { message: result.error.message } : null;
    } catch (error) {
      workError = {
        message:
          error instanceof Error ? error.message : "作品の保存中に予期しないエラーが発生しました。",
      };
    }

    if (workError || !work) {
      setFormMessage(`作品の保存に失敗しました: ${workError?.message ?? "不明なエラー"}`);
      return;
    }

    const { error: backlogError } = await supabase.from("backlog_items").insert({
      user_id: session.user.id,
      work_id: work.id,
      status,
      primary_platform: normalizePrimaryPlatform(primaryPlatform),
      note: note.trim() || null,
      sort_order: getNextSortOrder(items, status),
    });

    if (backlogError) {
      setFormMessage(`カードの保存に失敗しました: ${backlogError.message}`);
      return;
    }

    onClose();
    await onAdded();
  };

  const statusBtnClass = (active: boolean) =>
    `px-3 py-1 border rounded-[20px] text-[0.88rem] cursor-pointer transition-[background,color,border-color] duration-150${
      active
        ? " bg-primary border-primary text-primary-foreground font-semibold"
        : " border-[rgba(92,59,35,0.2)] bg-transparent text-muted-foreground hover:bg-[rgba(92,59,35,0.08)] hover:text-foreground"
    }`;

  const seasonBtnClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3.5 py-2.5 border rounded-full text-[0.88rem] cursor-pointer transition-[background,color,border-color,box-shadow] duration-150${
      active
        ? " border-[rgba(191,90,54,0.45)] shadow-[inset_0_0_0_1px_rgba(191,90,54,0.2)] bg-transparent text-foreground"
        : " border-[rgba(92,59,35,0.12)] bg-[rgba(255,255,255,0.84)] text-foreground"
    }`;

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
                isComposingRef.current = false;
                const query = e.currentTarget.value;
                setSearchQuery(query);
                if (query.trim()) {
                  queueSearch(query);
                } else {
                  resetSearchState();
                }
              }}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                if (isComposingRef.current) return;
                if (query.trim()) {
                  queueSearch(query);
                } else {
                  resetSearchState();
                }
              }}
            />

            {selectedTmdbResult && (
              <div className="grid gap-1 p-3 rounded-2xl bg-[rgba(255,255,255,0.68)]">
                <p className="text-muted-foreground text-[0.88rem]">選択中</p>
                <p className="font-bold">{selectedTmdbTarget?.title ?? selectedTmdbResult.title}</p>
                <p className="flex items-center gap-1 text-muted-foreground text-[0.88rem]">
                  {selectedTmdbTarget?.workType === "season" ? (
                    <>
                      <TvIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      シーズン
                    </>
                  ) : selectedTmdbResult.workType === "movie" ? (
                    <>
                      <FilmIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      映画
                    </>
                  ) : (
                    <>
                      <TvIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      シリーズ
                    </>
                  )}
                  {selectedTmdbTarget?.workType === "season" &&
                    ` · シーズン${selectedTmdbTarget.seasonNumber}`}
                  {(selectedTmdbTarget?.releaseDate ?? selectedTmdbResult.releaseDate) &&
                    ` · ${(selectedTmdbTarget?.releaseDate ?? selectedTmdbResult.releaseDate)!.slice(0, 4)}`}
                </p>
                {duplicateNotice && (
                  <p className="text-[0.82rem] text-muted-foreground px-2 py-1 rounded-lg bg-[rgba(0,0,0,0.08)]">
                    {duplicateNotice}
                  </p>
                )}
              </div>
            )}

            {selectedTmdbResult?.tmdbMediaType === "tv" && (
              <div className="grid gap-2.5">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    className={seasonBtnClass(selectedTmdbTarget?.workType !== "season")}
                    type="button"
                    onClick={() => {
                      if (selectedTmdbResult) {
                        setSelectedTmdbTarget(selectedTmdbResult);
                        checkDuplicates(selectedTmdbResult);
                      }
                    }}
                  >
                    シーズン1
                  </button>
                  {seasonOptions.length > 0
                    ? seasonOptions.map((season) => (
                        <button
                          key={season.seasonNumber}
                          className={seasonBtnClass(
                            selectedTmdbTarget?.workType === "season" &&
                              selectedTmdbTarget.seasonNumber === season.seasonNumber,
                          )}
                          type="button"
                          onClick={() => {
                            if (selectedTmdbResult?.tmdbMediaType !== "tv") return;
                            const target = {
                              tmdbId: selectedTmdbResult.tmdbId,
                              tmdbMediaType: "tv" as const,
                              workType: "season" as const,
                              title: season.title,
                              originalTitle: selectedTmdbResult.originalTitle,
                              overview: season.overview,
                              posterPath: season.posterPath,
                              releaseDate: season.releaseDate,
                              seasonNumber: season.seasonNumber,
                              episodeCount: season.episodeCount,
                              seriesTitle: selectedTmdbResult.title,
                            };
                            setSelectedTmdbTarget(target);
                            checkDuplicates(target);
                          }}
                        >
                          シーズン{season.seasonNumber}
                          {season.episodeCount && (
                            <span className="text-muted-foreground text-[0.8rem]">
                              {season.episodeCount}話
                            </span>
                          )}
                        </button>
                      ))
                    : isLoadingSeasons && (
                        <p className="text-muted-foreground text-[0.88rem]">
                          シーズン一覧を読み込んでいます...
                        </p>
                      )}
                  {seasonOptions.length > 0 && (
                    <button
                      className={seasonBtnClass(false)}
                      type="button"
                      onClick={() => {
                        if (!selectedTmdbResult) return;
                        void handleAddAllSeasons();
                      }}
                    >
                      全シーズン追加
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-2.5 overflow-y-auto max-[720px]:h-[min(40svh,320px)]">
              {(() => {
                const displayResults = searchQuery.trim() === "" ? trendingResults : searchResults;
                if (displayResults.length > 0) {
                  return displayResults.map((result) => (
                    <div
                      key={`${result.tmdbMediaType}-${result.tmdbId}`}
                      className="flex items-center gap-2 [&>*:first-child]:flex-1"
                    >
                      <TmdbWorkCard
                        result={result}
                        isSelected={selectedTmdbResult?.tmdbId === result.tmdbId}
                        onSelect={() => void handleSelectResult(result)}
                        onAddToStacked={
                          onAddToStacked ? () => void onAddToStacked(result) : undefined
                        }
                      />
                    </div>
                  ));
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
                  className={statusBtnClass(resolvedWorkType === t)}
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
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="保存先列">
              {statusOrder.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={statusBtnClass(status === s)}
                  onClick={() => setStatus(s)}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
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
            <div className="flex justify-end items-center gap-3 mt-auto pt-2 max-[720px]:mt-0">
              {formMessage && (
                <p className="text-muted-foreground text-sm" aria-live="polite">
                  {formMessage}
                </p>
              )}
              <Button type="submit">追加する</Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
