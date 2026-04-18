import { useId } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { PendingSaveNotice } from "./PendingSaveNotice.tsx";

type Props = Readonly<{
  resolvedTitle: string;
  note: string;
  formMessage: string;
  pendingSaveMessage: string | null;
  onChangeTitle: (title: string) => void;
  onChangeNote: (note: string) => void;
  onConfirmPendingSave: () => void;
  onCancelPendingSave: () => void;
}>;

export function GameAddModalDetailsPane({
  resolvedTitle,
  note,
  formMessage,
  pendingSaveMessage,
  onChangeTitle,
  onChangeNote,
  onConfirmPendingSave,
  onCancelPendingSave,
}: Props) {
  const noteId = useId();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 overflow-y-auto max-[720px]:overflow-y-visible">
      <Input
        name="title"
        type="text"
        placeholder="ゲームタイトル"
        aria-label="ゲームタイトル"
        maxLength={120}
        value={resolvedTitle}
        onChange={(e) => onChangeTitle(e.target.value)}
        required
      />
      <div className="rounded-2xl border border-border/70 bg-background/25 px-4 py-3">
        <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-primary uppercase">
          Work Type
        </p>
        <p className="mt-1 text-sm text-foreground">ゲーム</p>
      </div>
      <div className="flex items-start gap-2 w-full">
        <label htmlFor={noteId}>
          <DocumentTextIcon className="w-5 h-5 shrink-0 stroke-[1.5] text-muted-foreground mt-0.5" />
        </label>
        <textarea
          id={noteId}
          name="note"
          className="w-full p-0 border-none bg-transparent text-foreground leading-[1.6] outline-none resize-none min-h-[60px] flex-1 placeholder:text-muted-foreground"
          placeholder="メモを追加"
          maxLength={500}
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
        />
      </div>
      {pendingSaveMessage ? (
        <PendingSaveNotice
          message={pendingSaveMessage}
          onConfirm={onConfirmPendingSave}
          onCancel={onCancelPendingSave}
        />
      ) : (
        <div className="flex justify-end items-center gap-3 pt-1">
          {formMessage ? (
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {formMessage}
            </p>
          ) : null}
          <Button type="submit">積みゲーに追加</Button>
        </div>
      )}
    </div>
  );
}
