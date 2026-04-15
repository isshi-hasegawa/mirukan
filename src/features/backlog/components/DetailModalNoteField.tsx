import type { MutableRefObject } from "react";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import type { DetailModalState } from "../types.ts";

type Props = Readonly<{
  note: string | null;
  state: DetailModalState;
  inputRef: MutableRefObject<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement | null>;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onChangeDraft: (value: string) => void;
  onSave: () => Promise<void>;
}>;

export function DetailModalNoteField({
  note,
  state,
  inputRef,
  onStartEditing,
  onCancelEditing,
  onChangeDraft,
  onSave,
}: Props) {
  const isEditing = state.editingField === "note";

  if (!isEditing) {
    return (
      <button
        className="flex items-start gap-2 w-full p-0 border-none bg-transparent text-foreground text-left cursor-pointer"
        type="button"
        onClick={onStartEditing}
      >
        <DocumentTextIcon className="w-5 h-5 shrink-0 stroke-[1.5] text-muted-foreground mt-0.5" />
        <span
          className={`flex-1 leading-[1.6] whitespace-pre-wrap${note ? "" : " text-muted-foreground"}`}
        >
          {note || "メモを追加"}
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
        onChange={(e) => onChangeDraft(e.target.value)}
        onBlur={() => void onSave()}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void onSave();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancelEditing();
          }
        }}
      />
    </div>
  );
}
