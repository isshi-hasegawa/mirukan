import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import {
  initialTmdbSearchSelectionState,
  tmdbSearchSelectionReducer,
} from "./tmdb-search-selection.ts";
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

describe("tmdbSearchSelectionReducer", () => {
  test("select_result で選択状態をまとめて更新する", () => {
    const result = createSearchResult({ tmdbMediaType: "tv", workType: "series" });

    expect(
      tmdbSearchSelectionReducer(initialTmdbSearchSelectionState, {
        type: "select_result",
        result,
        selectedSeasonNumbersState: [1],
        duplicateNotice: "重複あり",
        canAddSelectionToStacked: true,
        isLoadingSeasons: true,
      }),
    ).toMatchObject({
      selectedTmdbResult: result,
      selectedSeasonNumbersState: [1],
      duplicateNotice: "重複あり",
      canAddSelectionToStacked: true,
      isLoadingSeasons: true,
      searchMessage: null,
    });
  });

  test("set_selected_seasons で duplicate 状態を更新する", () => {
    const selectedState = tmdbSearchSelectionReducer(initialTmdbSearchSelectionState, {
      type: "set_selected_seasons",
      selectedSeasonNumbersState: [2],
      duplicateNotice: "シーズン2はすでに視聴済みです。",
      canAddSelectionToStacked: true,
    });

    expect(selectedState.selectedSeasonNumbersState).toEqual([2]);
    expect(selectedState.duplicateNotice).toBe("シーズン2はすでに視聴済みです。");
    expect(selectedState.canAddSelectionToStacked).toBe(true);
  });

  test("reset で初期状態へ戻す", () => {
    const dirtyState = tmdbSearchSelectionReducer(initialTmdbSearchSelectionState, {
      type: "set_search_message",
      message: "エラー",
    });

    expect(tmdbSearchSelectionReducer(dirtyState, { type: "reset" })).toEqual(
      initialTmdbSearchSelectionState,
    );
  });
});
