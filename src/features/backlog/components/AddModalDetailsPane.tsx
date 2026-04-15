import { useId } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { DocumentTextIcon, FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import type { PrimaryPlatform } from "../types.ts";
import { PendingSaveNotice } from "./PendingSaveNotice.tsx";
import { PlatformPicker } from "./PlatformPicker.tsx";

type Props = Readonly<{
  selectedTmdbResult: { title: string } | null;
  resolvedTitle: string;
  resolvedWorkType: "movie" | "series";
  note: string;
  primaryPlatform: PrimaryPlatform;
  formMessage: string;
  pendingSaveMessage: string | null;
  onChangeTitle: (title: string) => void;
  onChangeWorkType: (workType: "movie" | "series") => void;
  onChangePrimaryPlatform: (platform: PrimaryPlatform) => void;
  onChangeNote: (note: string) => void;
  onConfirmPendingSave: () => void;
  onCancelPendingSave: () => void;
}>;

export function AddModalDetailsPane({
  selectedTmdbResult,
  resolvedTitle,
  resolvedWorkType,
  note,
  primaryPlatform,
  formMessage,
  pendingSaveMessage,
  onChangeTitle,
  onChangeWorkType,
  onChangePrimaryPlatform,
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
        placeholder="タイトル"
        aria-label="タイトル"
        maxLength={120}
        value={resolvedTitle}
        onChange={(e) => {
          onChangeTitle(e.target.value);
        }}
        required
      />
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="種別">
        {(["movie", "series"] as const).map((workType) => (
          <button
            key={workType}
            type="button"
            className={`px-3 py-1 border rounded-[20px] text-[0.88rem] cursor-pointer transition-[background,color,border-color] duration-150${
              resolvedWorkType === workType
                ? " bg-primary border-primary text-primary-foreground font-semibold"
                : " border-[rgba(92,59,35,0.2)] bg-transparent text-muted-foreground hover:bg-[rgba(92,59,35,0.08)] hover:text-foreground"
            }`}
            disabled={!!selectedTmdbResult}
            onClick={() => onChangeWorkType(workType)}
          >
            {workType === "movie" ? (
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
      <PlatformPicker value={primaryPlatform} onChange={onChangePrimaryPlatform} />
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
      {pendingSaveMessage && !selectedTmdbResult ? (
        <PendingSaveNotice
          message={pendingSaveMessage}
          onConfirm={onConfirmPendingSave}
          onCancel={onCancelPendingSave}
        />
      ) : null}
      {!selectedTmdbResult && !pendingSaveMessage && (
        <div className="flex justify-end items-center gap-3 pt-1">
          {formMessage && (
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {formMessage}
            </p>
          )}
          <Button type="submit">ストックに追加</Button>
        </div>
      )}
    </div>
  );
}
