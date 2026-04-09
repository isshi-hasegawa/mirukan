import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import type { PrimaryPlatform, WorkType } from "./types.ts";

type AddFlowDraftState = {
  primaryPlatform: PrimaryPlatform;
  note: string;
  manualTitle: string;
  workType: Extract<WorkType, "movie" | "series">;
};

type AddFlowDraftAction =
  | { type: "set_primary_platform"; primaryPlatform: PrimaryPlatform }
  | { type: "set_note"; note: string }
  | { type: "set_manual_title"; manualTitle: string }
  | { type: "set_work_type"; workType: Extract<WorkType, "movie" | "series"> };

export const initialAddFlowDraftState: AddFlowDraftState = {
  primaryPlatform: null,
  note: "",
  manualTitle: "",
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
    resolvedTitle: selectedTmdbResult?.title ?? state.manualTitle,
    resolvedWorkType: selectedTmdbResult?.workType ?? state.workType,
  };
}
