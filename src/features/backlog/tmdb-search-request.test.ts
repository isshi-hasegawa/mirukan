import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import {
  initialTmdbSearchRequestState,
  tmdbSearchRequestReducer,
} from "./tmdb-search-request.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";

setupTestLifecycle();

function createSearchResult(overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return {
    tmdbId: 1,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "作品タイトル",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: "2024-01-01",
    ...overrides,
  };
}

describe("tmdbSearchRequestReducer", () => {
  test("set_search_results で検索結果を更新する", () => {
    const results = [createSearchResult()];

    expect(
      tmdbSearchRequestReducer(initialTmdbSearchRequestState, {
        type: "set_search_results",
        results,
      }),
    ).toMatchObject({ searchResults: results });
  });

  test("reset_search_results で検索結果だけをクリアする", () => {
    const dirtyState = tmdbSearchRequestReducer(initialTmdbSearchRequestState, {
      type: "set_recommendations",
      results: [createSearchResult({ tmdbId: 2 })],
      message: "おすすめあり",
    });
    const withSearchResults = tmdbSearchRequestReducer(dirtyState, {
      type: "set_search_results",
      results: [createSearchResult()],
    });

    expect(
      tmdbSearchRequestReducer(withSearchResults, { type: "reset_search_results" }),
    ).toEqual({
      searchResults: [],
      recommendedResults: [createSearchResult({ tmdbId: 2 })],
      recommendedMessage: "おすすめあり",
    });
  });

  test("set_recommendations でおすすめ結果とメッセージを更新する", () => {
    expect(
      tmdbSearchRequestReducer(initialTmdbSearchRequestState, {
        type: "set_recommendations",
        results: [],
        message: "おすすめ候補が見つかりませんでした。",
      }),
    ).toEqual({
      searchResults: [],
      recommendedResults: [],
      recommendedMessage: "おすすめ候補が見つかりませんでした。",
    });
  });
});
