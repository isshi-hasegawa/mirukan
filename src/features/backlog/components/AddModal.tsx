import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import { fetchTmdbSeasonOptions, searchTmdbWorks } from "../../../lib/tmdb.ts";
import type { TmdbSearchResult, TmdbSelectionTarget, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { upsertTmdbWork, getNextSortOrder } from "../data.ts";
import { buildSearchText, normalizePrimaryPlatform } from "../helpers.ts";
import { platformLabels, statusLabels, statusOrder } from "../constants.ts";
import type { BacklogItem, BacklogStatus, WorkType } from "../types.ts";

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
  const [selectedTmdbTarget, setSelectedTmdbTarget] = useState<TmdbSelectionTarget | null>(null);
  const [seasonOptions, setSeasonOptions] = useState<TmdbSeasonOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

  const queueSearch = (query: string) => {
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      void runSearch(query);
    }, 250);
  };

  const runSearch = async (query: string) => {
    const trimmed = query.trim();
    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    if (!trimmed) {
      searchRequestIdRef.current += 1;
      setSearchResults([]);
      setSelectedTmdbResult(null);
      setSelectedTmdbTarget(null);
      setSeasonOptions([]);
      setIsSearching(false);
      setSearchMessage(null);
      setDuplicateNotice(null);
      return;
    }

    const requestId = ++searchRequestIdRef.current;
    setIsSearching(true);
    setSearchMessage(null);
    setSearchResults([]);
    setSelectedTmdbResult(null);
    setSelectedTmdbTarget(null);
    setSeasonOptions([]);
    setDuplicateNotice(null);

    try {
      const results = await searchTmdbWorks(trimmed);
      if (requestId !== searchRequestIdRef.current) return;
      setIsSearching(false);
      setSearchResults(results);
      setSearchMessage(
        results.length > 0 ? null : "候補が見つかりませんでした。このまま入力して追加できます。",
      );
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return;
      setIsSearching(false);
      setSearchMessage(
        error instanceof Error ? `検索に失敗しました: ${error.message}` : "検索に失敗しました。",
      );
    }
  };

  const checkDuplicates = (tmdbId: number, tmdbMediaType: "movie" | "tv") => {
    const activeStatuses: BacklogItem["status"][] = ["watching", "interrupted", "watched"];
    const matches = items.filter(
      (item) =>
        activeStatuses.includes(item.status) &&
        item.works?.tmdb_id === tmdbId &&
        item.works?.tmdb_media_type === tmdbMediaType,
    );
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
    checkDuplicates(result.tmdbId, result.tmdbMediaType);

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
          id="add-modal-form"
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
                    searchRequestIdRef.current += 1;
                    setSearchResults([]);
                    setSelectedTmdbResult(null);
                    setSelectedTmdbTarget(null);
                    setSeasonOptions([]);
                    setIsSearching(false);
                    setSearchMessage(null);
                  }
                }}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  if (isComposingRef.current) return;
                  if (query.trim()) {
                    queueSearch(query);
                  } else {
                    searchRequestIdRef.current += 1;
                    setSearchResults([]);
                    setSelectedTmdbResult(null);
                    setSelectedTmdbTarget(null);
                    setSeasonOptions([]);
                    setIsSearching(false);
                    setSearchMessage(null);
                  }
                }}
              />
              <button
                className="primary-button"
                type="button"
                onClick={() => void runSearch(searchQuery)}
              >
                {isSearching ? "検索中..." : "検索"}
              </button>
            </div>

            {selectedTmdbResult && (
              <div className="selected-result">
                <p className="selected-result-label">選択中</p>
                <p className="selected-result-title">
                  {selectedTmdbTarget?.title ?? selectedTmdbResult.title}
                </p>
                <p className="selected-result-meta">
                  {selectedTmdbTarget?.workType === "season"
                    ? "シーズン"
                    : selectedTmdbResult.workType === "movie"
                      ? "映画"
                      : "シリーズ"}
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
                <div className="season-picker-header">
                  <div>
                    <p className="selected-result-label">追加単位</p>
                    <p className="season-picker-copy">
                      シリーズ全体で積むか、シーズン単位で積むかを選べます。
                    </p>
                  </div>
                  {selectedTmdbTarget?.workType === "season" ? (
                    <span className="season-selection-badge">
                      シーズン{selectedTmdbTarget.seasonNumber}を選択中
                    </span>
                  ) : (
                    <span className="season-selection-badge">シリーズ全体を選択中</span>
                  )}
                </div>
                <div className="season-option-list">
                  <button
                    className={`season-option-button${selectedTmdbTarget?.workType !== "season" ? " is-selected" : ""}`}
                    type="button"
                    onClick={() => {
                      if (selectedTmdbResult) {
                        setSelectedTmdbTarget(selectedTmdbResult);
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
                            setSelectedTmdbTarget({
                              tmdbId: selectedTmdbResult.tmdbId,
                              tmdbMediaType: "tv",
                              workType: "season",
                              title: season.title,
                              originalTitle: selectedTmdbResult.originalTitle,
                              overview: season.overview,
                              posterPath: season.posterPath,
                              releaseDate: season.releaseDate,
                              seasonNumber: season.seasonNumber,
                              episodeCount: season.episodeCount,
                              seriesTitle: selectedTmdbResult.title,
                            });
                          }}
                        >
                          シーズン{season.seasonNumber}
                          {season.episodeCount && <span>{season.episodeCount}話</span>}
                        </button>
                      ))
                    : isLoadingSeasons && (
                        <p className="search-message">シーズン一覧を読み込んでいます...</p>
                      )}
                </div>
              </div>
            )}

            <div className="search-results">
              {searchResults.length > 0
                ? searchResults.map((result) => {
                    const posterUrl = result.posterPath
                      ? `https://image.tmdb.org/t/p/w185${result.posterPath}`
                      : null;
                    return (
                      <button
                        key={`${result.tmdbMediaType}-${result.tmdbId}`}
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
                            {result.workType === "movie" ? "映画" : "シリーズ"}
                            {result.releaseDate && ` · ${result.releaseDate.slice(0, 4)}`}
                          </span>
                          {result.overview && (
                            <span className="search-result-overview">{result.overview}</span>
                          )}
                        </span>
                      </button>
                    );
                  })
                : searchMessage && <p className="search-message">{searchMessage}</p>}
            </div>
          </div>

          <div className="modal-detail-fields">
            <label>
              <span>タイトル</span>
              <input
                name="title"
                type="text"
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
            </label>
            <label>
              <span>種別</span>
              <select
                name="workType"
                disabled={!!selectedTmdbResult}
                value={resolvedWorkType}
                onChange={(e) => setWorkType(e.target.value as "movie" | "series")}
              >
                <option value="movie">映画</option>
                <option value="series">シリーズ</option>
              </select>
            </label>
            <label>
              <span>保存先列</span>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as BacklogStatus)}
              >
                {statusOrder.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>視聴先</span>
              <select
                name="primaryPlatform"
                value={primaryPlatform}
                onChange={(e) => setPrimaryPlatform(e.target.value)}
              >
                <option value="">未設定</option>
                {Object.entries(platformLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>メモ</span>
              <textarea
                name="note"
                rows={4}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
        </form>
        <div className="modal-footer">
          <p className="form-message" aria-live="polite">
            {formMessage}
          </p>
          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={onClose}>
              キャンセル
            </button>
            <button className="primary-button" type="submit" form="add-modal-form">
              追加する
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
