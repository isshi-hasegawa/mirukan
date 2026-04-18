import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import {
  createDetailModalState,
  getGamePlatformsFromReleaseDates,
  getWorkMetadataLabels,
  getWorkTypeLabel,
} from "../helpers.ts";
import {
  gamePlatformBackgrounds,
  gamePlatformIcons,
  gamePlatformLabels,
  getStatusLabel,
  statusOrder,
  workTypeIconUrls,
} from "../constants.ts";
import { PosterImage } from "./PosterImage.tsx";
import { RottenTomatoesBadge } from "./RottenTomatoesBadge.tsx";
import { TmdbLink } from "./TmdbLink.tsx";
import { useDetailModalActions } from "../hooks/useDetailModalActions.ts";
import { DetailModalNoteField } from "./DetailModalNoteField.tsx";
import { DetailModalPlatformField } from "./DetailModalPlatformField.tsx";
import type { BacklogItem, BoardMode, DetailModalState } from "../types.ts";

type Props = Readonly<{
  boardMode?: BoardMode;
  item: BacklogItem | null;
  state: DetailModalState;
  items: BacklogItem[];
  onStateChange: Dispatch<SetStateAction<DetailModalState>>;
  onClose: () => void;
  onReload: () => Promise<void>;
}>;

export function DetailModal({
  boardMode,
  item,
  state,
  items,
  onStateChange,
  onClose,
  onReload,
}: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const { cancelEditing, handlePlatformSelect, handleStatusSelect, saveField, startEditing } =
    useDetailModalActions({
      item,
      items,
      state,
      onStateChange,
      onReload,
    });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state.editingField === null) {
          onClose();
        } else {
          onStateChange(createDetailModalState(item?.id ?? state.openItemId));
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state, onStateChange, onClose]);

  useEffect(() => {
    if (state.editingField && inputRef.current) {
      const el = inputRef.current;
      el.focus({ preventScroll: true });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.select();
      }
    }
  }, [state.editingField]);

  if (!item?.works) {
    return null;
  }

  const work = item.works;
  const resolvedBoardMode = boardMode ?? (work.work_type === "game" ? "game" : "video");
  const title = item.display_title?.trim() || work.title;
  const workTypeLabel = getWorkTypeLabel(work.work_type);
  const metadataLabels = getWorkMetadataLabels(work, {
    includeReleaseYear: true,
    includeRuntime: true,
    includeSeasonCount: true,
  });
  const gamePlatforms = getGamePlatformsFromReleaseDates(work.release_dates);

  const rtScore = work.rotten_tomatoes_score;

  return (
    <div className="fixed inset-0 z-10 grid place-items-center p-5 bg-[rgba(51,34,23,0.4)] backdrop-blur-[10px]">
      {/* Backdrop: native button for click-outside-to-close (keyboard users use Escape) */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />
      <dialog
        open
        className="relative w-full max-w-[860px] max-h-[min(88svh,920px)] border border-border rounded-[28px] bg-[#2a2a2a] shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6 flex flex-col overflow-hidden max-[720px]:p-5 max-[720px]:rounded-[22px]"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        <div className="grid grid-cols-[minmax(200px,260px)_minmax(0,1fr)] grid-rows-[auto_1fr] gap-x-6 gap-y-3.5 overflow-y-auto pr-1 flex-1 min-h-0 max-[720px]:grid-cols-[72px_1fr] max-[720px]:grid-rows-[auto_auto] max-[720px]:gap-y-4">
          <div
            className="sticky top-0 self-start row-span-full overflow-hidden rounded-3xl aspect-[2/3] border border-[rgba(92,59,35,0.08)] max-[720px]:static max-[720px]:col-[1] max-[720px]:row-[1] max-[720px]:rounded-xl"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(255,208,143,0.42), transparent 36%), linear-gradient(180deg, rgba(191,90,54,0.14), rgba(92,59,35,0.08))",
            }}
          >
            <PosterImage
              posterPath={work.poster_path}
              sourceType={work.source_type}
              alt={`${title} のポスター`}
              size="w500"
              className="block w-full h-full object-cover"
              fallbackClassName="w-full h-full grid place-items-center p-6 text-muted-foreground text-[1.1rem] tracking-[0.04em]"
            />
          </div>
          <div className="grid gap-1.5 content-start min-w-0 max-[720px]:col-[2] max-[720px]:row-[1]">
            <div className="flex items-start gap-3 min-w-0">
              <h2
                id="detail-modal-title"
                className="min-w-0 flex-1 text-[clamp(1.6rem,3vw,2.4rem)] max-[720px]:text-[1.1rem]"
              >
                {title}
              </h2>
              {work.tmdb_id && (
                <TmdbLink
                  href={`https://www.themoviedb.org/${work.tmdb_media_type === "movie" ? "movie" : "tv"}/${work.tmdb_id}`}
                  className="h-10 w-10 shrink-0"
                  iconClassName="h-6 w-6"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-muted-foreground text-[0.95rem]">
              <span className="inline-flex items-center gap-1">
                {work.work_type === "game" ? (
                  <img
                    src={workTypeIconUrls.game}
                    alt=""
                    className="w-4 h-4 shrink-0"
                    aria-hidden="true"
                  />
                ) : work.work_type === "movie" ? (
                  <FilmIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <TvIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                {workTypeLabel}
              </span>
              {metadataLabels.map((label) => (
                <span key={label} className="text-[0.84rem] leading-none text-muted-foreground/80">
                  {label}
                </span>
              ))}
            </div>
            {rtScore !== null && (
              <p className="text-[0.85rem]">
                <RottenTomatoesBadge
                  score={rtScore}
                  variant={rtScore >= 60 ? "fresh" : "rotten"}
                  appearance="plain"
                />
              </p>
            )}
          </div>
          <div className="grid gap-3.5 content-start max-[720px]:col-[1/-1] max-[720px]:row-[2]">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {statusOrder.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`px-3 py-1 border rounded-[20px] text-[0.88rem] cursor-pointer transition-[background,color,border-color] duration-150${
                    item.status === s
                      ? " bg-primary border-primary text-primary-foreground font-semibold"
                      : " border-[rgba(92,59,35,0.2)] bg-transparent text-muted-foreground hover:bg-[rgba(92,59,35,0.08)] hover:text-foreground"
                  }`}
                  onClick={() => handleStatusSelect(s)}
                >
                  {getStatusLabel(s, resolvedBoardMode)}
                </button>
              ))}
            </div>
            {resolvedBoardMode === "video" ? (
              <DetailModalPlatformField
                value={item.primary_platform}
                onSelect={handlePlatformSelect}
              />
            ) : null}
            {resolvedBoardMode === "game" && gamePlatforms.length > 0 ? (
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold text-foreground">対応プラットフォーム</h3>
                <div className="flex flex-wrap gap-2">
                  {gamePlatforms.map((platform) => (
                    <div
                      key={platform}
                      className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5"
                    >
                      <img
                        src={gamePlatformIcons[platform]}
                        alt=""
                        className="h-5 w-5 rounded-md p-1"
                        style={{ background: gamePlatformBackgrounds[platform] }}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-foreground">
                        {gamePlatformLabels[platform]}
                      </span>
                      {work.release_dates?.[platform] ? (
                        <span className="text-xs text-muted-foreground">
                          {work.release_dates[platform]}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {resolvedBoardMode === "game" &&
            (work.developer || work.publisher || work.franchise) ? (
              <section className="grid gap-2 rounded-2xl border border-border/70 bg-background/20 p-4">
                <h3 className="text-sm font-semibold text-foreground">ゲーム情報</h3>
                <div className="grid gap-1.5 text-sm text-muted-foreground">
                  {work.developer ? <p>Developer: {work.developer}</p> : null}
                  {work.publisher ? <p>Publisher: {work.publisher}</p> : null}
                  {work.franchise ? <p>Franchise: {work.franchise}</p> : null}
                </div>
              </section>
            ) : null}
            <DetailModalNoteField
              note={item.note}
              state={state}
              inputRef={inputRef}
              onStartEditing={() => startEditing("note")}
              onCancelEditing={cancelEditing}
              onChangeDraft={(draftValue) => onStateChange({ ...state, draftValue })}
              onSave={saveField}
            />

            {state.message && (
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {state.message}
              </p>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
