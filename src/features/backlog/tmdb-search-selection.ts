import type { TmdbSearchResult, TmdbSeasonOption } from "../../lib/tmdb.ts";

type SelectionState = {
  selectedTmdbResult: TmdbSearchResult | null;
  seasonOptions: TmdbSeasonOption[];
  selectedSeasonNumbersState: number[];
  isLoadingSeasons: boolean;
  searchMessage: string | null;
  duplicateNotice: string | null;
  canAddSelectionToStacked: boolean;
};

type SelectionAction =
  | { type: "reset" }
  | {
      type: "select_result";
      result: TmdbSearchResult;
      selectedSeasonNumbersState: number[];
      duplicateNotice: string | null;
      canAddSelectionToStacked: boolean;
      isLoadingSeasons: boolean;
    }
  | { type: "set_season_options"; seasonOptions: TmdbSeasonOption[] }
  | { type: "set_search_message"; message: string | null }
  | {
      type: "set_selected_seasons";
      selectedSeasonNumbersState: number[];
      duplicateNotice: string | null;
      canAddSelectionToStacked: boolean;
    };

export const initialTmdbSearchSelectionState: SelectionState = {
  selectedTmdbResult: null,
  seasonOptions: [],
  selectedSeasonNumbersState: [],
  isLoadingSeasons: false,
  searchMessage: null,
  duplicateNotice: null,
  canAddSelectionToStacked: true,
};

export function tmdbSearchSelectionReducer(
  state: SelectionState,
  action: SelectionAction,
): SelectionState {
  switch (action.type) {
    case "reset":
      return initialTmdbSearchSelectionState;
    case "select_result":
      return {
        ...state,
        selectedTmdbResult: action.result,
        seasonOptions: [],
        selectedSeasonNumbersState: action.selectedSeasonNumbersState,
        isLoadingSeasons: action.isLoadingSeasons,
        searchMessage: null,
        duplicateNotice: action.duplicateNotice,
        canAddSelectionToStacked: action.canAddSelectionToStacked,
      };
    case "set_season_options":
      return {
        ...state,
        seasonOptions: action.seasonOptions,
        isLoadingSeasons: false,
      };
    case "set_search_message":
      return {
        ...state,
        isLoadingSeasons: false,
        searchMessage: action.message,
      };
    case "set_selected_seasons":
      return {
        ...state,
        selectedSeasonNumbersState: action.selectedSeasonNumbersState,
        duplicateNotice: action.duplicateNotice,
        canAddSelectionToStacked: action.canAddSelectionToStacked,
      };
    default:
      return state;
  }
}
