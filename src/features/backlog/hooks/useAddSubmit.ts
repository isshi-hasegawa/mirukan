import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { upsertBacklogItemsToStatus } from "../backlog-repository.ts";
import {
  resolveSelectedSeasonWorkIds,
  upsertManualWork,
  upsertTmdbWork,
} from "../work-repository.ts";
import type { BacklogItem, WorkType } from "../types.ts";
import { browserBacklogFeedback, type BacklogFeedback } from "../ui-feedback.ts";
import {
  buildSelectedSubject,
  buildStackedBacklogOptions,
  confirmStackedSave,
} from "../add-submit-flow.ts";

type UseAddSubmitOptions = {
  items: BacklogItem[];
  session: Session;
  selectedTmdbResult: TmdbSearchResult | null;
  selectedSeasonNumbers: number[];
  seasonOptions: TmdbSeasonOption[];
  isTvSelection: boolean;
  resolvedTitle: string;
  resolvedWorkType: WorkType;
  primaryPlatform: string;
  note: string;
  onClose: () => void;
  onAdded: () => Promise<void>;
  feedback?: BacklogFeedback;
};

export function useAddSubmit({
  items,
  session,
  selectedTmdbResult,
  selectedSeasonNumbers,
  seasonOptions,
  isTvSelection,
  resolvedTitle,
  resolvedWorkType,
  primaryPlatform,
  note,
  onClose,
  onAdded,
  feedback = browserBacklogFeedback,
}: UseAddSubmitOptions) {
  const [formMessage, setFormMessage] = useState("");

  const clearFormMessage = () => setFormMessage("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = resolvedTitle.trim();
    const subject = buildSelectedSubject({
      selectedTmdbResult,
      selectedSeasonNumbers,
      resolvedTitle,
    });
    const backlogOptions = buildStackedBacklogOptions(primaryPlatform, note);

    if (!title) {
      setFormMessage("タイトルを入力してください。");
      return;
    }

    if (isTvSelection) {
      if (selectedSeasonNumbers.length === 0 || !selectedTmdbResult) {
        setFormMessage("追加するシーズンを1つ以上選択してください。");
        return;
      }

      setFormMessage("シーズンをストックへ追加しています...");
      const result = await resolveSelectedSeasonWorkIds(
        selectedTmdbResult,
        session.user.id,
        selectedSeasonNumbers,
        { seasonOptions },
      );

      if (result.error) {
        setFormMessage(`シーズンの準備に失敗しました: ${result.error}`);
        return;
      }

      const confirmResult = await confirmStackedSave({
        items,
        workIds: result.workIds,
        subject,
        emptyMessage: "選択したシーズンはすでにストックにあります。",
        feedback,
      });
      if (!confirmResult.shouldSave) {
        setFormMessage(confirmResult.message);
        return;
      }

      const upsertResult = await upsertBacklogItemsToStatus(
        session.user.id,
        items,
        result.workIds,
        "stacked",
        backlogOptions,
      );
      if (upsertResult.error) {
        setFormMessage(`シーズンの保存に失敗しました: ${upsertResult.error}`);
        return;
      }

      onClose();
      await onAdded();
      return;
    }

    setFormMessage("作品をストックへ追加しています...");

    let work: { id: string } | null = null;
    let workError: { message: string } | null = null;

    try {
      const result = selectedTmdbResult
        ? await upsertTmdbWork(selectedTmdbResult, session.user.id)
        : await upsertManualWork(
            title,
            resolvedWorkType as Extract<WorkType, "movie" | "series">,
            session.user.id,
          );

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

    const confirmResult = await confirmStackedSave({
      items,
      workIds: [work.id],
      subject,
      emptyMessage: "すでにストックにあります。",
      feedback,
    });
    if (!confirmResult.shouldSave) {
      setFormMessage(confirmResult.message);
      return;
    }

    const backlogResult = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      [work.id],
      "stacked",
      backlogOptions,
    );

    if (backlogResult.error) {
      setFormMessage(`カードの保存に失敗しました: ${backlogResult.error}`);
      return;
    }

    onClose();
    await onAdded();
  };

  return { formMessage, clearFormMessage, handleSubmit };
}
