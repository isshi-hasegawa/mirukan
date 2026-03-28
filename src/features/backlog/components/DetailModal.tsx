import { useEffect, useRef } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../../lib/supabase.ts";
import { getSortOrderForStatusChange } from "../data.ts";
import { normalizePrimaryPlatform } from "../helpers.ts";
import { statusLabels, statusOrder } from "../constants.ts";
import { PlatformPicker } from "./PlatformPicker.tsx";
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
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w500${work.poster_path}` : null;
  const metadata = [
    work.work_type === "movie" ? "映画" : work.work_type === "series" ? "シリーズ" : "シーズン",
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

  const renderNote = () => {
    const isEditing = state.editingField === "note";

    if (!isEditing) {
      return (
        <button className="detail-note-field" type="button" onClick={() => startEditing("note")}>
          <DocumentTextIcon className="detail-note-icon" />
          <span className={`detail-note-text${item.note ? "" : " is-placeholder"}`}>
            {item.note || "メモを追加"}
          </span>
        </button>
      );
    }

    return (
      <div className="detail-note-editing">
        <DocumentTextIcon className="detail-note-icon" />
        <textarea
          ref={(el) => {
            inputRef.current = el;
          }}
          className="detail-inline-control detail-inline-textarea"
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

  return (
    <div
      className="modal-backdrop"
      id="detail-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="detail-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        <div className="detail-modal-body">
          <div className="detail-poster">
            {posterUrl ? (
              <img src={posterUrl} alt={`${title} のポスター`} />
            ) : (
              <div className="detail-poster-fallback">No Poster</div>
            )}
          </div>
          <div className="detail-title-area">
            <h2 id="detail-modal-title">{title}</h2>
            <p className="detail-meta">{metadata.join(" · ")}</p>
          </div>
          <div className="detail-fields">
            <div className="detail-status-picker">
              {statusOrder.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`detail-status-btn${item.status === s ? " is-active" : ""}`}
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
              <p className="form-message" aria-live="polite">
                {state.message}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
