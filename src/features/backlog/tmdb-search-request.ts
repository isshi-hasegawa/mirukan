import type { TmdbSearchResult } from "../../lib/tmdb.ts";

type SearchRequestState = {
  searchResults: TmdbSearchResult[];
  recommendedResults: TmdbSearchResult[];
  recommendedMessage: string | null;
};

type SearchRequestAction =
  | { type: "reset_search_results" }
  | { type: "set_search_results"; results: TmdbSearchResult[] }
  | {
      type: "set_recommendations";
      results: TmdbSearchResult[];
      message: string | null;
    };

export const initialTmdbSearchRequestState: SearchRequestState = {
  searchResults: [],
  recommendedResults: [],
  recommendedMessage: null,
};

export function tmdbSearchRequestReducer(
  state: SearchRequestState,
  action: SearchRequestAction,
): SearchRequestState {
  switch (action.type) {
    case "reset_search_results":
      return {
        ...state,
        searchResults: [],
      };
    case "set_search_results":
      return {
        ...state,
        searchResults: action.results,
      };
    case "set_recommendations":
      return {
        ...state,
        recommendedResults: action.results,
        recommendedMessage: action.message,
      };
    default:
      return state;
  }
}
