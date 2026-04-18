import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { IgdbSearchResult } from "../../../lib/igdb.ts";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { upsertBacklogItemsToStatus } from "../backlog-repository.ts";
import {
  resolveSelectedSeasonWorkIds,
  upsertIgdbWork,
  upsertManualWork,
  upsertTmdbWork,
} from "../work-repository.ts";
import type { BacklogItem, GamePlatform, PrimaryPlatform, WorkType } from "../types.ts";
import {
  buildSelectedSubject,
  buildStackedBacklogOptions,
  confirmStackedSave,
} from "../add-submit-flow.ts";
import { type SubmitPhase, initialSubmitPhase } from "../add-flow-state.ts";

type UseAddSubmitOptions = {
  items: BacklogItem[];
  session: Session;
  selectedTmdbResult: TmdbSearchResult | null;
  selectedIgdbResult?: IgdbSearchResult | null;
  selectedSeasonNumbers: number[];
  seasonOptions: TmdbSeasonOption[];
  isTvSelection: boolean;
  resolvedTitle: string;
  resolvedWorkType: WorkType;
  primaryPlatform: PrimaryPlatform | GamePlatform;
  note: string;
  onClose: () => void;
  onAdded: () => void | Promise<void>;
};

function buildDisplayTitle(
  selectedTmdbResult: TmdbSearchResult | null,
  selectedIgdbResult: IgdbSearchResult | null,
  resolvedTitle: string,
  workCount: number,
) {
  if (workCount !== 1 || (!selectedTmdbResult && !selectedIgdbResult)) {
    return null;
  }

  const trimmedTitle = resolvedTitle.trim();
  const defaultTitle = (selectedTmdbResult?.title ?? selectedIgdbResult?.title ?? "").trim();

  if (!trimmedTitle || trimmedTitle === defaultTitle) {
    return null;
  }

  return trimmedTitle;
}

function toWorkSaveErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "作品の保存中に予期しないエラーが発生しました。";
}

export function useAddSubmit({
  items,
  session,
  selectedTmdbResult,
  selectedIgdbResult = null,
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
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>(initialSubmitPhase);

  const clearSubmissionState = () => {
    setSubmitPhase({ phase: "idle" });
  };

  const buildBacklogOptions = (workIds: string[], displayTitle: string | null) => ({
    workIds,
    backlogOptions: {
      ...buildStackedBacklogOptions(primaryPlatform, note),
      display_title: displayTitle,
    },
  });

  const saveToStacked = async (payload: {
    workIds: string[];
    backlogOptions: {
      display_title: string | null;
      note: string | null;
      primary_platform: PrimaryPlatform | GamePlatform;
    };
  }) => {
    const backlogResult = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      payload.workIds,
      "stacked",
      payload.backlogOptions,
    );

    if (backlogResult.error) {
      setSubmitPhase({
        phase: "error",
        message: `カードの保存に失敗しました: ${backlogResult.error}`,
      });
      return;
    }

    setSubmitPhase({ phase: "idle" });
    onClose();
    void onAdded();
  };

  const confirmPendingSave = async () => {
    if (submitPhase.phase !== "pending_confirm") {
      return;
    }

    const { workIds, backlogOptions } = submitPhase;
    setSubmitPhase({ phase: "loading", message: "ストックへ戻しています..." });
    await saveToStacked({ workIds, backlogOptions });
  };

  const cancelPendingSave = () => {
    setSubmitPhase({ phase: "idle" });
  };

  const saveWithConfirmation = async ({
    workIds,
    subject,
    emptyMessage,
    displayTitle,
  }: {
    workIds: string[];
    subject: ReturnType<typeof buildSelectedSubject>;
    emptyMessage: string;
    displayTitle: string | null;
  }) => {
    const confirmResult = confirmStackedSave({
      items,
      workIds,
      subject,
      emptyMessage,
    });

    if (confirmResult.type === "empty") {
      setSubmitPhase({ phase: "error", message: confirmResult.message });
      return;
    }

    const savePayload = buildBacklogOptions(workIds, displayTitle);

    if (confirmResult.type === "confirm") {
      setSubmitPhase({
        phase: "pending_confirm",
        message: confirmResult.message,
        ...savePayload,
      });
      return;
    }

    await saveToStacked(savePayload);
  };

  const createWork = async (title: string) => {
    try {
      if (selectedTmdbResult) {
        return await upsertTmdbWork(selectedTmdbResult, session.user.id);
      }
      if (selectedIgdbResult) {
        return await upsertIgdbWork(selectedIgdbResult, session.user.id);
      }
      return await upsertManualWork(
        title,
        resolvedWorkType as Extract<WorkType, "movie" | "series" | "game">,
        session.user.id,
      );
    } catch (error) {
      return {
        data: null,
        error: { message: toWorkSaveErrorMessage(error) },
      };
    }
  };

  const submitTvSelection = async (subject: ReturnType<typeof buildSelectedSubject>) => {
    if (selectedSeasonNumbers.length === 0 || !selectedTmdbResult) {
      setSubmitPhase({
        phase: "error",
        message: "追加するシーズンを1つ以上選択してください。",
      });
      return;
    }

    setSubmitPhase({ phase: "loading", message: "シーズンをストックへ追加しています..." });
    const result = await resolveSelectedSeasonWorkIds(
      selectedTmdbResult,
      session.user.id,
      selectedSeasonNumbers,
      {
        seasonOptions,
      },
    );

    if (result.error) {
      setSubmitPhase({
        phase: "error",
        message: `シーズンの準備に失敗しました: ${result.error}`,
      });
      return;
    }

    await saveWithConfirmation({
      workIds: result.workIds,
      subject,
      emptyMessage: "選択したシーズンはすでにストックにあります。",
      // シーズン row には series タイトルを上書きしない
      displayTitle: null,
    });
  };

  const submitSingleWork = async (
    title: string,
    subject: ReturnType<typeof buildSelectedSubject>,
  ) => {
    setSubmitPhase({ phase: "loading", message: "作品をストックへ追加しています..." });

    const result = await createWork(title);
    if (result.error || !result.data) {
      setSubmitPhase({
        phase: "error",
        message: `作品の保存に失敗しました: ${result.error?.message ?? "不明なエラー"}`,
      });
      return;
    }

    await saveWithConfirmation({
      workIds: [result.data.id],
      subject,
      emptyMessage:
        resolvedWorkType === "game" ? "すでに積みゲーにあります。" : "すでにストックにあります。",
      displayTitle: buildDisplayTitle(selectedTmdbResult, selectedIgdbResult, resolvedTitle, 1),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const title = resolvedTitle.trim();
    const subject = buildSelectedSubject({
      selectedTmdbResult,
      selectedIgdbResult,
      selectedSeasonNumbers,
      resolvedTitle,
    });
    if (!title) {
      setSubmitPhase({ phase: "error", message: "タイトルを入力してください。" });
      return;
    }

    if (isTvSelection) {
      await submitTvSelection(subject);
      return;
    }

    await submitSingleWork(title, subject);
  };

  // useAddFlow が参照する既存 API との互換を維持するための導出値
  const formMessage =
    submitPhase.phase === "loading" || submitPhase.phase === "error" ? submitPhase.message : "";
  const pendingSaveMessage = submitPhase.phase === "pending_confirm" ? submitPhase.message : null;

  return {
    formMessage,
    pendingSaveMessage,
    clearSubmissionState,
    confirmPendingSave,
    cancelPendingSave,
    handleSubmit,
  };
}
