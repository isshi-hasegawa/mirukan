import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import {
  buildMoveToStatusConfirmMessage,
  planBacklogItemUpserts,
} from "../backlog-item-utils.ts";
import { upsertBacklogItemsToStatus } from "../backlog-repository.ts";
import {
  resolveSelectedSeasonWorkIds,
  upsertManualWork,
  upsertTmdbWork,
} from "../work-repository.ts";
import { normalizePrimaryPlatform } from "../helpers.ts";
import type { BacklogItem, WorkType } from "../types.ts";

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

  const clearFormMessage = () => setFormMessage("");

  const buildSelectedSubject = () => {
    if (!selectedTmdbResult) {
      return `「${resolvedTitle.trim() || "この作品"}」`;
    }
    if (selectedTmdbResult.tmdbMediaType !== "tv") {
      return `「${selectedTmdbResult.title}」`;
    }
    if (selectedSeasonNumbers.length <= 3) {
      return selectedSeasonNumbers.map((seasonNumber) => `シーズン${seasonNumber}`).join("・");
    }
    return `${selectedSeasonNumbers.length}シーズン`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = resolvedTitle.trim();

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

      const plan = planBacklogItemUpserts(items, result.workIds, "stacked");
      const confirmMessage = buildMoveToStatusConfirmMessage(
        plan.existingOtherItems,
        "stacked",
        buildSelectedSubject(),
      );
      if (confirmMessage && !window.confirm(confirmMessage)) {
        setFormMessage("既存カードはそのままにしました。");
        return;
      }
      if (plan.actions.length === 0) {
        setFormMessage("選択したシーズンはすでにストックにあります。");
        return;
      }

      const upsertResult = await upsertBacklogItemsToStatus(
        session.user.id,
        items,
        result.workIds,
        "stacked",
        {
          primaryPlatform: normalizePrimaryPlatform(primaryPlatform),
          note: note.trim() || null,
        },
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

    const plan = planBacklogItemUpserts(items, [work.id], "stacked");
    const confirmMessage = buildMoveToStatusConfirmMessage(
      plan.existingOtherItems,
      "stacked",
      buildSelectedSubject(),
    );
    if (confirmMessage && !window.confirm(confirmMessage)) {
      setFormMessage("既存カードはそのままにしました。");
      return;
    }
    if (plan.actions.length === 0) {
      setFormMessage("すでにストックにあります。");
      return;
    }

    const backlogResult = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      [work.id],
      "stacked",
      {
        primaryPlatform: normalizePrimaryPlatform(primaryPlatform),
        note: note.trim() || null,
      },
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
