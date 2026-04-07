/**
 * Central export of all MSW handlers
 */

export {
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
