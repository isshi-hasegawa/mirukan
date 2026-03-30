import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { CheckIcon, DocumentTextIcon, FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import { TmdbWorkCard } from "./TmdbWorkCard.tsx";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import { fetchTmdbSeasonOptions, fetchTmdbTrending, searchTmdbWorks } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { addSelectedSeasons, getNextSortOrder, upsertTmdbWork } from "../data.ts";
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
};

export function AddModal({ defaultStatus, items, session, onClose, onAdded }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbSearchResult[]>([]);
  const [selectedTmdbResult, setSelectedTmdbResult] = useState<TmdbSearchResult | null>(null);
  const [seasonOptions, setSeasonOptions] = useState<TmdbSeasonOption[]>([]);
  const [selectedSeasonNumbers, setSelectedSeasonNumbers] = useState<number[]>([]);

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

  const isTvSelection = selectedTmdbResult?.tmdbMediaType === "tv";
  const allSeasonNumbers = [1, ...seasonOptions.map((season) => season.seasonNumber)];
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
  const resolvedTitle = selectedTmdbResult?.title ?? manualTitle;
  const resolvedWorkType = selectedTmdbResult?.workType ?? workType;

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
    setSeasonOptions([]);
    setSelectedSeasonNumbers([]);
    setIsLoadingSeasons(false);
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

  const updateDuplicateNotice = (result: TmdbSearchResult, seasonNumbers: number[] = []) => {
    const activeStatuses: BacklogItem["status"][] = ["watching", "interrupted", "watched"];
    const matches = items.filter((item) => {
      const w = item.works;
      if (!activeStatuses.includes(item.status)) return false;
      if (w?.tmdb_id !== result.tmdbId || w?.tmdb_media_type !== result.tmdbMediaType) return false;
      if (result.tmdbMediaType === "tv") {
        return seasonNumbers.some((seasonNumber) =>
          seasonNumber === 1
            ? w?.work_type === "series"
            : w?.work_type === "season" && w?.season_number === seasonNumber,
        );
      }
      return w?.work_type === result.workType;
    });

    if (matches.length === 0) {
      setDuplicateNotice(null);
      return;
    }

    const labels = matches.map((item) => statusLabels[item.status]);
    const unique = [...new Set(labels)];
    if (result.tmdbMediaType === "tv") {
      const duplicatedSeasons = seasonNumbers.filter((seasonNumber) =>
        items.some((item) => {
          const work = item.works;
          if (!activeStatuses.includes(item.status)) return false;
          if (work?.tmdb_id !== result.tmdbId || work.tmdb_media_type !== result.tmdbMediaType) {
            return false;
          }
          return seasonNumber === 1
            ? work.work_type === "series"
            : work.work_type === "season" && work.season_number === seasonNumber;
        }),
      );
      const seasonLabel = duplicatedSeasons
        .map((seasonNumber) => `シーズン${seasonNumber}`)
        .join("・");
      setDuplicateNotice(`${seasonLabel}は「${unique.join("・")}」にすでにカードがあります`);
      return;
    }

    setDuplicateNotice(`「${unique.join("・")}」にすでにカードがあります`);
  };

  const handleSelectResult = async (result: TmdbSearchResult) => {
    setSelectedTmdbResult(result);
    setSeasonOptions([]);
    setFormMessage("");
    setSearchMessage(null);

    if (result.tmdbMediaType !== "tv") {
      setIsLoadingSeasons(false);
      setSelectedSeasonNumbers([]);
      updateDuplicateNotice(result);
      return;
    }

    setSelectedSeasonNumbers([1]);
    updateDuplicateNotice(result, [1]);

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

  const toggleSeasonSelection = (seasonNumber: number) => {
    if (!selectedTmdbResult || selectedTmdbResult.tmdbMediaType !== "tv") return;

    setSelectedSeasonNumbers((current) => {
      const next = current.includes(seasonNumber)
        ? current.filter((value) => value !== seasonNumber)
        : [...current, seasonNumber].sort((left, right) => left - right);
      updateDuplicateNotice(selectedTmdbResult, next);
      return next;
    });
  };

  const toggleAllSeasons = () => {
    if (!selectedTmdbResult || selectedTmdbResult.tmdbMediaType !== "tv") return;

    const next =
      selectedSeasonNumbers.length === allSeasonNumbers.length ? [] : [...allSeasonNumbers];
    setSelectedSeasonNumbers(next);
    updateDuplicateNotice(selectedTmdbResult, next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = resolvedTitle.trim();

    if (!title) {
      setFormMessage("タイトルを入力してください。");
      return;
    }

    if (isTvSelection) {
      if (selectedSeasonNumbers.length === 0 || !selectedTmdbResult) {
        setFormMessage("追加するシーズンを1つ以上選択してください。");
        return;
      }

      setFormMessage("シーズンを追加しています...");
      const result = await addSelectedSeasons(
        selectedTmdbResult,
        session.user.id,
        status,
        items,
        selectedSeasonNumbers,
        {
          seasonOptions,
          primaryPlatform: normalizePrimaryPlatform(primaryPlatform),
          note: note.trim() || null,
        },
      );

      if (result.error) {
        setFormMessage(`シーズンの追加に失敗しました: ${result.error}`);
        return;
      }

      onClose();
      await onAdded();
      return;
    }

    setFormMessage("作品を追加しています...");

    let work: { id: string } | null = null;
    let workError: { message: string } | null = null;

    try {
      const result = selectedTmdbResult
        ? await upsertTmdbWork(selectedTmdbResult, session.user.id)
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
    `inline-flex items-center gap-2 px-3.5 py-2.5 border rounded-full text-[0.88rem] cursor-pointer transition-[background,color,border-color,box-shadow] duration-150${
      active
        ? " border-[rgba(191,90,54,0.45)] shadow-[inset_0_0_0_1px_rgba(191,90,54,0.2)] bg-[rgba(191,90,54,0.08)] text-foreground"
        : " border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-foreground hover:bg-[rgba(255,255,255,0.1)]"
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
              <div className="grid gap-1 p-3 rounded-2xl bg-[rgba(255,255,255,0.07)]">
                <p className="text-muted-foreground text-[0.88rem]">選択中</p>
                <p className="font-bold">{selectedTmdbResult.title}</p>
                <p className="flex items-center gap-1 text-muted-foreground text-[0.88rem]">
                  {selectedTmdbResult.workType === "movie" ? (
                    <>
                      <FilmIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      映画
                    </>
                  ) : (
                    <>
                      <TvIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {selectedSeasonSummary}
                    </>
                  )}
                  {selectedTmdbResult.releaseDate &&
                    ` · ${selectedTmdbResult.releaseDate.slice(0, 4)}`}
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
                    className={seasonBtnClass(selectedSeasonNumbers.includes(1))}
                    type="button"
                    aria-pressed={selectedSeasonNumbers.includes(1)}
                    onClick={() => toggleSeasonSelection(1)}
                  >
                    <span
                      className={`grid w-4 h-4 place-items-center rounded-full border ${
                        selectedSeasonNumbers.includes(1)
                          ? "border-[rgb(191,90,54)] bg-[rgb(191,90,54)] text-white"
                          : "border-[rgba(255,255,255,0.3)] text-transparent"
                      }`}
                    >
                      <CheckIcon className="w-3 h-3" aria-hidden="true" />
                    </span>
                    <span>シーズン1</span>
                  </button>
                  {seasonOptions.length > 0
                    ? seasonOptions.map((season) => (
                        <button
                          key={season.seasonNumber}
                          className={seasonBtnClass(
                            selectedSeasonNumbers.includes(season.seasonNumber),
                          )}
                          type="button"
                          aria-pressed={selectedSeasonNumbers.includes(season.seasonNumber)}
                          onClick={() => toggleSeasonSelection(season.seasonNumber)}
                        >
                          <span
                            className={`grid w-4 h-4 place-items-center rounded-full border ${
                              selectedSeasonNumbers.includes(season.seasonNumber)
                                ? "border-[rgb(191,90,54)] bg-[rgb(191,90,54)] text-white"
                                : "border-[rgba(255,255,255,0.3)] text-transparent"
                            }`}
                          >
                            <CheckIcon className="w-3 h-3" aria-hidden="true" />
                          </span>
                          <span>シーズン{season.seasonNumber}</span>
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
                      className={seasonBtnClass(hasAllSeasonsSelected)}
                      type="button"
                      aria-pressed={hasAllSeasonsSelected}
                      onClick={toggleAllSeasons}
                    >
                      <span
                        className={`grid w-4 h-4 place-items-center rounded-full border ${
                          hasAllSeasonsSelected
                            ? "border-[rgb(191,90,54)] bg-[rgb(191,90,54)] text-white"
                            : "border-[rgba(255,255,255,0.3)] text-transparent"
                        }`}
                      >
                        <CheckIcon className="w-3 h-3" aria-hidden="true" />
                      </span>
                      <span>{hasAllSeasonsSelected ? "すべて解除" : "すべて選択"}</span>
                    </button>
                  )}
                </div>
                <p className="text-[0.82rem] text-muted-foreground">
                  追加したいシーズンを複数選択できます。
                </p>
              </div>
            )}

            {selectedTmdbResult && (
              <div className="flex justify-end items-center gap-3">
                {formMessage && (
                  <p className="text-muted-foreground text-sm" aria-live="polite">
                    {formMessage}
                  </p>
                )}
                <Button type="submit">追加する</Button>
              </div>
            )}

            <div className="modal-scrollable grid gap-2.5 overflow-y-auto max-[720px]:h-[min(40svh,320px)]">
              {(() => {
                const displayResults = searchQuery.trim() === "" ? trendingResults : searchResults;
                if (displayResults.length > 0) {
                  return displayResults.map((result) => (
                    <TmdbWorkCard
                      key={`${result.tmdbMediaType}-${result.tmdbId}`}
                      result={result}
                      isSelected={selectedTmdbResult?.tmdbId === result.tmdbId}
                      onSelect={() => void handleSelectResult(result)}
                    />
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
            {!selectedTmdbResult && (
              <div className="flex justify-end items-center gap-3 mt-auto pt-2 max-[720px]:mt-0">
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
