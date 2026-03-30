import { useEffect, useRef } from "react";
import { DocumentTextIcon, FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../../lib/supabase.ts";
import { getSortOrderForStatusChange } from "../data.ts";
import { normalizePrimaryPlatform } from "../helpers.ts";
import { statusLabels, statusOrder } from "../constants.ts";
import { PlatformPicker } from "./PlatformPicker.tsx";
import { PosterImage } from "./PosterImage.tsx";
import { TmdbLink } from "./TmdbLink.tsx";
import type { BacklogItem, BacklogStatus, DetailModalState } from "../types.ts";

type Props = {
  item: BacklogItem | null;
  state: DetailModalState;
  items: BacklogItem[];
  onStateChange: (state: DetailModalState) => void;
  onClose: () => void;
  onUpdate: (item: BacklogItem) => void;
};

export function DetailModal({ item, state, items, onStateChange, onClose, onUpdate }: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state.editingField !== null) {
          onStateChange({ ...state, editingField: null, draftValue: "", message: null });
        } else {
          onClose();
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

  if (!item || !item.works) {
    return null;
  }

  const work = item.works;
  const title = work.title;
  const WorkTypeIcon = work.work_type === "movie" ? FilmIcon : TvIcon;
  const workTypeLabel =
    work.work_type === "movie" ? "映画" : work.work_type === "series" ? "シリーズ" : "シーズン";
  const metadataRest = [
    work.release_date ? work.release_date.slice(0, 4) : null,
    work.runtime_minutes ? `${work.runtime_minutes}分` : null,
    work.typical_episode_runtime_minutes ? `1話 ${work.typical_episode_runtime_minutes}分` : null,
    work.season_count ? `${work.season_count}シーズン` : null,
  ].filter(Boolean);

  const handleStatusSelect = async (status: BacklogStatus) => {
    if (status === item.status) return;
    const nextSortOrder = getSortOrderForStatusChange(items, item.id, status);
    const { error } = await supabase
      .from("backlog_items")
      .update({ status, sort_order: nextSortOrder })
      .eq("id", item.id);
    if (error) {
      onStateChange({ ...state, message: `更新に失敗しました: ${error.message}` });
      return;
    }
    onUpdate({ ...item, status, sort_order: nextSortOrder });
    onStateChange({ openItemId: item.id, editingField: null, draftValue: "", message: null });
  };

  const saveField = async () => {
    if (!state.editingField || !item) return;

    const update: Record<string, string | number | null> = {};

    if (state.editingField === "primaryPlatform") {
      update.primary_platform = normalizePrimaryPlatform(state.draftValue);
    } else if (state.editingField === "note") {
      update.note = state.draftValue.trim() || null;
    }

    const { error } = await supabase.from("backlog_items").update(update).eq("id", item.id);

    if (error) {
      onStateChange({ ...state, message: `更新に失敗しました: ${error.message}` });
      return;
    }

    const updatedItem: BacklogItem = {
      ...item,
      primary_platform:
        state.editingField === "primaryPlatform"
          ? normalizePrimaryPlatform(state.draftValue)
          : item.primary_platform,
      note: state.editingField === "note" ? ((update.note as string | null) ?? null) : item.note,
    };

    onUpdate(updatedItem);
    onStateChange({ openItemId: item.id, editingField: null, draftValue: "", message: null });
  };

  const startEditing = (field: NonNullable<DetailModalState["editingField"]>) => {
    const draftValue =
      field === "primaryPlatform" ? (item.primary_platform ?? "") : (item.note ?? "");
    onStateChange({ ...state, editingField: field, draftValue, message: null });
  };

  const cancelEditing = () => {
    onStateChange({ ...state, editingField: null, draftValue: "", message: null });
  };

  const handlePlatformSelect = async (value: string) => {
    const platform = normalizePrimaryPlatform(value);
    const { error } = await supabase
      .from("backlog_items")
      .update({ primary_platform: platform })
      .eq("id", item.id);
    if (error) {
      onStateChange({ ...state, message: `更新に失敗しました: ${error.message}` });
      return;
    }
    onUpdate({ ...item, primary_platform: platform });
    onStateChange({ openItemId: item.id, editingField: null, draftValue: "", message: null });
  };

  const renderNote = () => {
    const isEditing = state.editingField === "note";

    if (!isEditing) {
      return (
        <button
          className="flex items-start gap-2 w-full p-0 border-none bg-transparent text-foreground text-left cursor-pointer"
          type="button"
          onClick={() => startEditing("note")}
        >
          <DocumentTextIcon className="w-5 h-5 shrink-0 stroke-[1.5] text-muted-foreground mt-0.5" />
          <span
            className={`flex-1 leading-[1.6] whitespace-pre-wrap${item.note ? "" : " text-muted-foreground"}`}
          >
            {item.note || "メモを追加"}
          </span>
        </button>
      );
    }

    return (
      <div className="flex items-start gap-2 w-full">
        <DocumentTextIcon className="w-5 h-5 shrink-0 stroke-[1.5] text-muted-foreground mt-0.5" />
        <textarea
          ref={(el) => {
            inputRef.current = el;
          }}
          className="w-full p-0 border-none bg-transparent text-foreground leading-[1.6] outline-none resize-none min-h-[108px] flex-1 placeholder:text-muted-foreground"
          placeholder="メモを追加"
          rows={5}
          maxLength={500}
          value={state.draftValue}
          onChange={(e) => onStateChange({ ...state, draftValue: e.target.value })}
          onBlur={() => void saveField()}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void saveField();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelEditing();
            }
          }}
        />
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center p-5 bg-[rgba(51,34,23,0.4)] backdrop-blur-[10px]"
      id="detail-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="relative w-full max-w-[860px] max-h-[min(88svh,920px)] border border-border rounded-[28px] bg-[#2a2a2a] shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6 flex flex-col overflow-hidden max-[720px]:p-5 max-[720px]:rounded-[22px]"
        role="dialog"
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
            <p className="flex items-center gap-1 text-muted-foreground text-[0.95rem]">
              <WorkTypeIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {workTypeLabel}
              {metadataRest.length > 0 && ` · ${metadataRest.join(" · ")}`}
            </p>
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
                  onClick={() => void handleStatusSelect(s)}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
            <PlatformPicker
              value={item.primary_platform ?? ""}
              onChange={(v) => void handlePlatformSelect(v)}
            />
            {renderNote()}

            {state.message && (
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {state.message}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
