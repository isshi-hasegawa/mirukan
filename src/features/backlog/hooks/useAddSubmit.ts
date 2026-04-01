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
};

type PendingStackedSave = {
  message: string;
  workIds: string[];
  backlogOptions: {
    note: string | null;
    primaryPlatform: string | null;
  };
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
}: UseAddSubmitOptions) {
  const [formMessage, setFormMessage] = useState("");
  const [pendingSave, setPendingSave] = useState<PendingStackedSave | null>(null);

  const clearSubmissionState = () => {
    setFormMessage("");
    setPendingSave(null);
  };

  const saveToStacked = async (payload: Omit<PendingStackedSave, "message">) => {
    const backlogResult = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      payload.workIds,
      "stacked",
      payload.backlogOptions,
    );

    if (backlogResult.error) {
      setFormMessage(`カードの保存に失敗しました: ${backlogResult.error}`);
      return;
    }

    setPendingSave(null);
    onClose();
    await onAdded();
  };

  const confirmPendingSave = async () => {
    if (!pendingSave) {
      return;
    }

    setFormMessage("ストックへ戻しています...");
    await saveToStacked({
      workIds: pendingSave.workIds,
      backlogOptions: pendingSave.backlogOptions,
    });
  };

  const cancelPendingSave = () => {
    setPendingSave(null);
    setFormMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = resolvedTitle.trim();
    const subject = buildSelectedSubject({
      selectedTmdbResult,
      selectedSeasonNumbers,
      resolvedTitle,
    });
    const backlogOptions = buildStackedBacklogOptions(primaryPlatform, note);
    setPendingSave(null);

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
      });

      if (confirmResult.type === "empty") {
        setFormMessage(confirmResult.message);
        return;
      }

      if (confirmResult.type === "confirm") {
        setFormMessage("");
        setPendingSave({
          message: confirmResult.message,
          workIds: result.workIds,
          backlogOptions,
        });
        return;
      }

      await saveToStacked({
        workIds: result.workIds,
        backlogOptions,
      });
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
    });

    if (confirmResult.type === "empty") {
      setFormMessage(confirmResult.message);
      return;
    }

    if (confirmResult.type === "confirm") {
      setFormMessage("");
      setPendingSave({
        message: confirmResult.message,
        workIds: [work.id],
        backlogOptions,
      });
      return;
    }

    await saveToStacked({
      workIds: [work.id],
      backlogOptions,
    });
  };

  return {
    formMessage,
    pendingSaveMessage: pendingSave?.message ?? null,
    clearSubmissionState,
    confirmPendingSave,
    cancelPendingSave,
    handleSubmit,
  };
}
