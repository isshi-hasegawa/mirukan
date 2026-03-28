import { useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase.ts";
import { getSortOrderForStatusChange } from "../data.ts";
import { normalizePrimaryPlatform } from "../helpers.ts";
import { platformLabels, statusLabels, statusOrder } from "../constants.ts";
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
  const title = item.display_title ?? work.title;
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w500${work.poster_path}` : null;
  const metadata = [
    work.work_type === "movie" ? "映画" : work.work_type === "series" ? "シリーズ" : "シーズン",
    work.release_date ? work.release_date.slice(0, 4) : null,
    work.runtime_minutes ? `${work.runtime_minutes}分` : null,
    work.typical_episode_runtime_minutes ? `1話 ${work.typical_episode_runtime_minutes}分` : null,
    work.season_count ? `${work.season_count}シーズン` : null,
  ].filter(Boolean);

  const saveField = async () => {
    if (!state.editingField || !item) return;

    const update: Record<string, string | number | null> = {};
    let nextSortOrder = item.sort_order;

    if (state.editingField === "displayTitle") {
      update.display_title = state.draftValue.trim() || null;
    } else if (state.editingField === "status") {
      const status = state.draftValue as BacklogStatus;
      update.status = status;
      nextSortOrder = getSortOrderForStatusChange(items, item.id, status);
      update.sort_order = nextSortOrder;
    } else if (state.editingField === "primaryPlatform") {
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
      display_title:
        state.editingField === "displayTitle"
          ? ((update.display_title as string | null) ?? null)
          : item.display_title,
      status: state.editingField === "status" ? (state.draftValue as BacklogStatus) : item.status,
      sort_order: state.editingField === "status" ? nextSortOrder : item.sort_order,
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
    let draftValue = "";
    if (field === "displayTitle") draftValue = item.display_title ?? "";
    else if (field === "status") draftValue = item.status;
    else if (field === "primaryPlatform") draftValue = item.primary_platform ?? "";
    else if (field === "note") draftValue = item.note ?? "";
    onStateChange({ ...state, editingField: field, draftValue, message: null });
  };

  const cancelEditing = () => {
    onStateChange({ ...state, editingField: null, draftValue: "", message: null });
  };

  const renderEditableField = (
    field: NonNullable<DetailModalState["editingField"]>,
    label: string,
    displayValue: string,
    options?: { value: string; label: string }[],
    multiline?: boolean,
    placeholder?: string,
  ) => {
    const isEditing = state.editingField === field;

    if (!isEditing) {
      return (
        <button className="detail-inline-field" type="button" onClick={() => startEditing(field)}>
          <span className="detail-inline-label">{label}</span>
          <span
            className={`detail-inline-value${displayValue === "未設定" ? " is-placeholder" : ""}`}
          >
            {displayValue}
          </span>
        </button>
      );
    }

    if (options) {
      return (
        <div className="detail-inline-field is-editing">
          <span className="detail-inline-label">{label}</span>
          <select
            ref={(el) => {
              inputRef.current = el;
            }}
            className="detail-inline-control"
            value={state.draftValue}
            onChange={(e) => onStateChange({ ...state, draftValue: e.target.value })}
            onBlur={() => void saveField()}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEditing();
              }
            }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (multiline) {
      return (
        <div className="detail-inline-field is-editing">
          <span className="detail-inline-label">{label}</span>
          <textarea
            ref={(el) => {
              inputRef.current = el;
            }}
            className="detail-inline-control detail-inline-textarea"
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
    }

    return (
      <div className="detail-inline-field is-editing">
        <span className="detail-inline-label">{label}</span>
        <input
          ref={(el) => {
            inputRef.current = el;
          }}
          className="detail-inline-control"
          type="text"
          maxLength={120}
          value={state.draftValue}
          placeholder={placeholder}
          onChange={(e) => onStateChange({ ...state, draftValue: e.target.value })}
          onBlur={() => void saveField()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
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

  const statusOptions = statusOrder.map((s) => ({ value: s, label: statusLabels[s] }));
  const platformOptions = [
    { value: "", label: "未設定" },
    ...Object.entries(platformLabels).map(([value, label]) => ({ value, label })),
  ];

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
            {renderEditableField(
              "displayTitle",
              "表示名",
              item.display_title ?? "未設定",
              undefined,
              false,
              work.title,
            )}
            {renderEditableField("status", "状態", statusLabels[item.status], statusOptions)}
            {renderEditableField(
              "primaryPlatform",
              "視聴先",
              item.primary_platform ? platformLabels[item.primary_platform] : "未設定",
              platformOptions,
            )}
            {renderEditableField("note", "メモ", item.note ?? "未設定", undefined, true)}

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
