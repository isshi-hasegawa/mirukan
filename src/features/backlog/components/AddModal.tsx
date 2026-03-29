import { useEffect, useRef, useState } from "react";
import { DocumentTextIcon, FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import { fetchTmdbSeasonOptions, fetchTmdbTrending, searchTmdbWorks } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult, TmdbSelectionTarget, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { upsertTmdbWork, getNextSortOrder, addAllSeasons } from "../data.ts";
import { buildSearchText, normalizePrimaryPlatform } from "../helpers.ts";
import { platformLabels, statusLabels, statusOrder } from "../constants.ts";
import { PlatformPicker } from "./PlatformPicker.tsx";
import type { BacklogItem, BacklogStatus, WorkType } from "../types.ts";

const SEARCH_DEBOUNCE_MS = 250;

type Props = {
  defaultStatus: BacklogStatus;
  items: BacklogItem[];
  session: Session;
  onClose: () => void;
  onAdded: () => Promise<void>;
  onAddToStacked?: (result: TmdbSearchResult) => Promise<void>;
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

  return (
    <div
      className="modal-backdrop"
      id="add-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-label="作品を追加">
        <form
          className="modal-form"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <div className="search-panel">
            <div className="search-row">
              <input
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
            </div>

            {selectedTmdbResult && (
              <div className="selected-result">
                <p className="selected-result-label">選択中</p>
                <p className="selected-result-title">
                  {selectedTmdbTarget?.title ?? selectedTmdbResult.title}
                </p>
                <p className="selected-result-meta">
                  {selectedTmdbTarget?.workType === "season" ? (
                    <>
                      <TvIcon className="work-type-icon" aria-hidden="true" />
                      シーズン
                    </>
                  ) : selectedTmdbResult.workType === "movie" ? (
                    <>
                      <FilmIcon className="work-type-icon" aria-hidden="true" />
                      映画
                    </>
                  ) : (
                    <>
                      <TvIcon className="work-type-icon" aria-hidden="true" />
                      シリーズ
                    </>
                  )}
                  {selectedTmdbTarget?.workType === "season" &&
                    ` · シーズン${selectedTmdbTarget.seasonNumber}`}
                  {(selectedTmdbTarget?.releaseDate ?? selectedTmdbResult.releaseDate) &&
                    ` · ${(selectedTmdbTarget?.releaseDate ?? selectedTmdbResult.releaseDate)!.slice(0, 4)}`}
                </p>
                {duplicateNotice && <p className="duplicate-notice">{duplicateNotice}</p>}
              </div>
            )}

            {selectedTmdbResult?.tmdbMediaType === "tv" && (
              <div className="season-picker">
                <div className="season-option-list">
                  <button
                    className={`season-option-button${selectedTmdbTarget?.workType !== "season" ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => {
                      if (selectedTmdbResult) {
                        setSelectedTmdbTarget(selectedTmdbResult);
                        checkDuplicates(selectedTmdbResult);
                      }
                    }}
                  >
                    シリーズ全体
                  </button>
                  {seasonOptions.length > 0
                    ? seasonOptions.map((season) => (
                        <button
                          key={season.seasonNumber}
                          className={`season-option-button${
                            selectedTmdbTarget?.workType === "season" &&
                            selectedTmdbTarget.seasonNumber === season.seasonNumber
                              ? " is-selected"
                              : ""
                          }`}
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
                          {season.episodeCount && <span>{season.episodeCount}話</span>}
                        </button>
                      ))
                    : isLoadingSeasons && (
                        <p className="search-message">シーズン一覧を読み込んでいます...</p>
                      )}
                  {seasonOptions.length > 0 && (
                    <button
                      className="season-option-button season-option-button--all"
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

            <div className="search-results">
              {(() => {
                const displayResults = searchQuery.trim() === "" ? trendingResults : searchResults;
                if (displayResults.length > 0) {
                  return displayResults.map((result) => {
                    const posterUrl = result.posterPath
                      ? `https://image.tmdb.org/t/p/w185${result.posterPath}`
                      : null;
                    return (
                      <div
                        key={`${result.tmdbMediaType}-${result.tmdbId}`}
                        className="search-result-entry"
                      >
                        <button
                          className={`search-result-button${selectedTmdbResult?.tmdbId === result.tmdbId ? " is-selected" : ""}`}
                          type="button"
                          onClick={() => void handleSelectResult(result)}
                        >
                          <span className="search-result-thumb">
                            {posterUrl ? (
                              <img src={posterUrl} alt={`${result.title} のポスター`} />
                            ) : (
                              <span className="search-result-thumb-fallback">No Poster</span>
                            )}
                          </span>
                          <span className="search-result-content">
                            <span className="search-result-title">{result.title}</span>
                            <span className="search-result-meta">
                              {result.workType === "movie" ? (
                                <FilmIcon className="work-type-icon" aria-hidden="true" />
                              ) : (
                                <TvIcon className="work-type-icon" aria-hidden="true" />
                              )}
                              {result.workType === "movie" ? "映画" : "シリーズ"}
                              {result.releaseDate && ` · ${result.releaseDate.slice(0, 4)}`}
                            </span>
                            {result.jpWatchPlatforms.length > 0 && (
                              <span className="search-result-platforms">
                                {result.jpWatchPlatforms.map(({ key, logoPath }) => {
                                  const label = platformLabels[key as keyof typeof platformLabels];
                                  if (!label) return null;
                                  return logoPath ? (
                                    <img
                                      key={key}
                                      src={`https://image.tmdb.org/t/p/w45${logoPath}`}
                                      alt={label}
                                      title={label}
                                      className="search-result-platform-logo"
                                    />
                                  ) : (
                                    <span key={key} className="search-result-platform-badge">
                                      {label}
                                    </span>
                                  );
                                })}
                              </span>
                            )}
                            {result.overview && (
                              <span className="search-result-overview">{result.overview}</span>
                            )}
                          </span>
                        </button>
                        {onAddToStacked && (
                          <button
                            type="button"
                            className="recommend-item-action recommend-item-action-stack"
                            onClick={() => void onAddToStacked(result)}
                          >
                            ストックに追加
                          </button>
                        )}
                      </div>
                    );
                  });
                }
                return searchMessage && <p className="search-message">{searchMessage}</p>;
              })()}
            </div>
          </div>

          <div className="modal-detail-fields">
            <input
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
            <div className="detail-status-picker" role="group" aria-label="種別">
              {(["movie", "series"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`detail-status-btn${resolvedWorkType === t ? " is-active" : ""}`}
                  disabled={!!selectedTmdbResult}
                  onClick={() => setWorkType(t)}
                >
                  {t === "movie" ? (
                    <>
                      <FilmIcon className="work-type-icon" aria-hidden="true" />
                      映画
                    </>
                  ) : (
                    <>
                      <TvIcon className="work-type-icon" aria-hidden="true" />
                      シリーズ
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="detail-status-picker" role="group" aria-label="保存先列">
              {statusOrder.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`detail-status-btn${status === s ? " is-active" : ""}`}
                  onClick={() => setStatus(s)}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
            <PlatformPicker value={primaryPlatform} onChange={setPrimaryPlatform} />
            <div className="detail-note-editing">
              <DocumentTextIcon className="detail-note-icon" />
              <textarea
                name="note"
                className="detail-inline-control detail-inline-textarea"
                placeholder="メモを追加"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="modal-detail-submit">
              {formMessage && (
                <p className="form-message" aria-live="polite">
                  {formMessage}
                </p>
              )}
              <button className="primary-button" type="submit">
                追加する
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
