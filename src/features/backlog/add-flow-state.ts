import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import type { PrimaryPlatform, WorkType } from "./types.ts";

// Submit フローの状態遷移:
//   idle → loading → error      (バリデーション失敗・API エラー)
//   idle → loading → idle       (保存完了後モーダルを閉じる)
//   idle → loading → pending_confirm → loading → idle  (既存カード確認後に保存)
//   pending_confirm → idle      (キャンセル)
//   any → idle                  (clearSubmissionState)

type BacklogOptions = {
  note: string | null;
  primary_platform: PrimaryPlatform;
};

export type SubmitPhase =
  | { phase: "idle" }
  | { phase: "loading"; message: string }
  | { phase: "error"; message: string }
  | {
      phase: "pending_confirm";
      message: string;
      workIds: string[];
      backlogOptions: BacklogOptions;
    };

export const initialSubmitPhase: SubmitPhase = { phase: "idle" };

type AddFlowDraftState = {
  primaryPlatform: PrimaryPlatform;
  note: string;
  manualTitle: string;
  selectedTitleOverride: string;
  workType: Extract<WorkType, "movie" | "series">;
};

type AddFlowDraftAction =
  | { type: "set_primary_platform"; primaryPlatform: PrimaryPlatform }
  | { type: "set_note"; note: string }
  | { type: "set_manual_title"; manualTitle: string }
  | { type: "set_selected_title_override"; selectedTitleOverride: string }
  | { type: "set_work_type"; workType: Extract<WorkType, "movie" | "series"> };

export const initialAddFlowDraftState: AddFlowDraftState = {
  primaryPlatform: null,
  note: "",
  manualTitle: "",
  selectedTitleOverride: "",
  workType: "movie",
};

export function addFlowDraftReducer(
  state: AddFlowDraftState,
  action: AddFlowDraftAction,
): AddFlowDraftState {
  switch (action.type) {
    case "set_primary_platform":
      return { ...state, primaryPlatform: action.primaryPlatform };
    case "set_note":
      return { ...state, note: action.note };
    case "set_manual_title":
      return { ...state, manualTitle: action.manualTitle };
    case "set_selected_title_override":
      return { ...state, selectedTitleOverride: action.selectedTitleOverride };
    case "set_work_type":
      return { ...state, workType: action.workType };
    default:
      return state;
  }
}

export function resolveAddFlowDraft(
  state: AddFlowDraftState,
  selectedTmdbResult: TmdbSearchResult | null,
) {
  return {
    resolvedTitle: selectedTmdbResult
      ? state.selectedTitleOverride || selectedTmdbResult.title
      : state.manualTitle,
    resolvedWorkType: selectedTmdbResult?.workType ?? state.workType,
  };
}
