/**
 * Central export of all MSW handlers
 */

export {
  setMockDisplayTitleSuggestion,
  setMockTmdbSearchResults,
  resetMockTmdbData,
  setMockTmdbSeasonOptions,
  setMockTmdbSimilarResults,
  setMockTmdbTrendingResults,
  setMockTmdbWorkDetails,
  supabaseFunctionsHandlers,
} from "./supabase-functions";
export {
  getMockBacklogItems,
  getMockWorks,
  resetMockData,
  setMockBacklogItems,
  setMockWorks,
  supabaseRestHandlers,
} from "./supabase-rest";
