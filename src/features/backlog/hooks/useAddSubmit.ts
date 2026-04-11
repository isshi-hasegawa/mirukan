import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { getTopSortOrder } from "../backlog-item-utils.ts";
import { upsertBacklogItemsToStatus } from "../backlog-repository.ts";
import {
  buildSelectedSeasonTargets,
  resolveSelectedSeasonWorkIds,
  upsertManualWork,
  upsertTmdbWork,
} from "../work-repository.ts";
import type { BacklogItem, PrimaryPlatform, WorkSummary, WorkType } from "../types.ts";
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
  selectedSeasonNumbers: number[];
  seasonOptions: TmdbSeasonOption[];
  isTvSelection: boolean;
  resolvedTitle: string;
  resolvedWorkType: WorkType;
  primaryPlatform: PrimaryPlatform;
  note: string;
  onClose: () => void;
  onOptimisticAdd?: (items: BacklogItem[]) => void;
  onRollbackOptimisticAdd?: (itemIds: string[]) => void;
  beginOptimisticUpdate?: () => () => void;
  onAdded: () => void | Promise<void>;
};

function createOptimisticBacklogItems(
  items: BacklogItem[],
  workSummaries: WorkSummary[],
  backlogOptions: { note: string | null; primary_platform: PrimaryPlatform },
) {
  let sortOrder = getTopSortOrder(items, "stacked", workSummaries.length);

  return workSummaries.map((workSummary) => {
    const optimisticItem: BacklogItem = {
      id: `optimistic-${workSummary.id}`,
      status: "stacked",
      primary_platform: backlogOptions.primary_platform,
      note: backlogOptions.note,
      sort_order: sortOrder,
      works: workSummary,
    };

    sortOrder += 1000;

    return optimisticItem;
  });
}

function createTmdbWorkSummary(workId: string, result: TmdbSearchResult): WorkSummary {
  return {
    id: workId,
    title: result.title,
    work_type: result.workType,
    source_type: "tmdb",
    tmdb_id: result.tmdbId,
    tmdb_media_type: result.tmdbMediaType,
    original_title: result.originalTitle,
    overview: result.overview,
    poster_path: result.posterPath,
    release_date: result.releaseDate,
    runtime_minutes: null,
    typical_episode_runtime_minutes: null,
    duration_bucket: null,
    genres: [],
    season_count: null,
    season_number: null,
    focus_required_score: null,
    background_fit_score: null,
    completion_load_score: null,
    rotten_tomatoes_score: null,
    imdb_rating: null,
    imdb_votes: null,
    metacritic_score: null,
  };
}

function createSeasonWorkSummaries(
  result: { workIds: string[] },
  seasonTargets: ReturnType<typeof buildSelectedSeasonTargets>,
) {
  return seasonTargets.map((target, index) => ({
    id: result.workIds[index]!,
    title: target.title,
    work_type: target.workType,
    source_type: "tmdb" as const,
    tmdb_id: target.tmdbId,
    tmdb_media_type: target.tmdbMediaType,
    original_title: target.originalTitle,
    overview: target.overview,
    poster_path: target.posterPath,
    release_date: target.releaseDate,
    runtime_minutes: null,
    typical_episode_runtime_minutes: null,
    duration_bucket: null,
    genres: [],
    season_count: null,
    season_number: target.workType === "season" ? target.seasonNumber : 1,
    focus_required_score: null,
    background_fit_score: null,
    completion_load_score: null,
    rotten_tomatoes_score: null,
    imdb_rating: null,
    imdb_votes: null,
    metacritic_score: null,
  }));
}

function createManualWorkSummary(
  workId: string,
  title: string,
  workType: Extract<WorkType, "movie" | "series">,
): WorkSummary {
  return {
    id: workId,
    title,
    work_type: workType,
    source_type: "manual",
    tmdb_id: null,
    tmdb_media_type: null,
    original_title: null,
    overview: null,
    poster_path: null,
    release_date: null,
    runtime_minutes: null,
    typical_episode_runtime_minutes: null,
    duration_bucket: null,
    genres: [],
    season_count: null,
    season_number: null,
    focus_required_score: null,
    background_fit_score: null,
    completion_load_score: null,
    rotten_tomatoes_score: null,
    imdb_rating: null,
    imdb_votes: null,
    metacritic_score: null,
  };
}

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
  onOptimisticAdd,
  onRollbackOptimisticAdd,
  beginOptimisticUpdate,
  onAdded,
}: UseAddSubmitOptions) {
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>(initialSubmitPhase);

  const clearSubmissionState = () => {
    setSubmitPhase({ phase: "idle" });
  };

  const saveToStacked = async (payload: {
    workIds: string[];
    backlogOptions: { note: string | null; primary_platform: PrimaryPlatform };
    optimisticWorkSummaries: WorkSummary[];
  }) => {
    const optimisticItems = createOptimisticBacklogItems(
      items,
      payload.optimisticWorkSummaries,
      payload.backlogOptions,
    );
    const rollbackOptimisticUpdate = beginOptimisticUpdate?.();

    onOptimisticAdd?.(optimisticItems);

    const backlogResult = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      payload.workIds,
      "stacked",
      payload.backlogOptions,
    );

    if (backlogResult.error) {
      onRollbackOptimisticAdd?.(optimisticItems.map((item) => item.id));
      rollbackOptimisticUpdate?.();
      setSubmitPhase({
        phase: "error",
        message: `カードの保存に失敗しました: ${backlogResult.error}`,
      });
      return;
    }

    setSubmitPhase({ phase: "idle" });
    onClose();
    try {
      await onAdded();
    } finally {
      rollbackOptimisticUpdate?.();
    }
  };

  const confirmPendingSave = async () => {
    if (submitPhase.phase !== "pending_confirm") {
      return;
    }

    const { workIds, backlogOptions, optimisticWorkSummaries } = submitPhase;
    setSubmitPhase({ phase: "loading", message: "ストックへ戻しています..." });
    await saveToStacked({ workIds, backlogOptions, optimisticWorkSummaries });
  };

  const cancelPendingSave = () => {
    setSubmitPhase({ phase: "idle" });
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

    if (!title) {
      setSubmitPhase({ phase: "error", message: "タイトルを入力してください。" });
      return;
    }

    if (isTvSelection) {
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
        { seasonOptions },
      );

      if (result.error) {
        setSubmitPhase({
          phase: "error",
          message: `シーズンの準備に失敗しました: ${result.error}`,
        });
        return;
      }

      const confirmResult = confirmStackedSave({
        items,
        workIds: result.workIds,
        subject,
        emptyMessage: "選択したシーズンはすでにストックにあります。",
      });
      const seasonTargets = buildSelectedSeasonTargets(
        selectedTmdbResult,
        seasonOptions,
        selectedSeasonNumbers,
      );
      const optimisticWorkSummaries = createSeasonWorkSummaries(result, seasonTargets);

      if (confirmResult.type === "empty") {
        setSubmitPhase({ phase: "error", message: confirmResult.message });
        return;
      }

      if (confirmResult.type === "confirm") {
        setSubmitPhase({
          phase: "pending_confirm",
          message: confirmResult.message,
          workIds: result.workIds,
          backlogOptions,
          optimisticWorkSummaries,
        });
        return;
      }

      await saveToStacked({
        workIds: result.workIds,
        backlogOptions,
        optimisticWorkSummaries,
      });
      return;
    }

    setSubmitPhase({ phase: "loading", message: "作品をストックへ追加しています..." });

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
      setSubmitPhase({
        phase: "error",
        message: `作品の保存に失敗しました: ${workError?.message ?? "不明なエラー"}`,
      });
      return;
    }

    const confirmResult = confirmStackedSave({
      items,
      workIds: [work.id],
      subject,
      emptyMessage: "すでにストックにあります。",
    });

    if (confirmResult.type === "empty") {
      setSubmitPhase({ phase: "error", message: confirmResult.message });
      return;
    }

    if (confirmResult.type === "confirm") {
      setSubmitPhase({
        phase: "pending_confirm",
        message: confirmResult.message,
        workIds: [work.id],
        backlogOptions,
        optimisticWorkSummaries: [
          selectedTmdbResult
            ? createTmdbWorkSummary(work.id, selectedTmdbResult)
            : createManualWorkSummary(
                work.id,
                title,
                resolvedWorkType as Extract<WorkType, "movie" | "series">,
              ),
        ],
      });
      return;
    }

    await saveToStacked({
      workIds: [work.id],
      backlogOptions,
      optimisticWorkSummaries: [
        selectedTmdbResult
          ? createTmdbWorkSummary(work.id, selectedTmdbResult)
          : createManualWorkSummary(
              work.id,
              title,
              resolvedWorkType as Extract<WorkType, "movie" | "series">,
            ),
      ],
    });
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
