import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import {
  addFlowDraftReducer,
  initialAddFlowDraftState,
  resolveAddFlowDraft,
} from "./add-flow-state.ts";

setupTestLifecycle();

function createSearchResult(overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return {
    tmdbId: 1,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "TMDb作品",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: "2024-01-01",
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
    ...overrides,
  };
}

describe("addFlowDraftReducer", () => {
  test("手動入力の draft を action ごとに更新する", () => {
    const state = addFlowDraftReducer(initialAddFlowDraftState, {
      type: "set_manual_title",
      manualTitle: "手動作品",
    });

    expect(
      addFlowDraftReducer(state, {
        type: "set_note",
        note: "メモ",
      }),
    ).toMatchObject({
      manualTitle: "手動作品",
      note: "メモ",
      workType: "movie",
      primaryPlatform: null,
    });
  });

  test("種別とプラットフォームを保持する", () => {
    const state = addFlowDraftReducer(initialAddFlowDraftState, {
      type: "set_work_type",
      workType: "series",
    });

    expect(
      addFlowDraftReducer(state, {
        type: "set_primary_platform",
        primaryPlatform: "netflix",
      }),
    ).toMatchObject({
      workType: "series",
      primaryPlatform: "netflix",
    });
  });
});

describe("resolveAddFlowDraft", () => {
  test("TMDb 選択時は検索結果の title と workType を優先する", () => {
    expect(
      resolveAddFlowDraft(
        {
          primaryPlatform: null,
          note: "",
          manualTitle: "手動作品",
          workType: "series",
        },
        createSearchResult({ title: "TMDb作品", workType: "movie" }),
      ),
    ).toEqual({
      resolvedTitle: "TMDb作品",
      resolvedWorkType: "movie",
    });
  });

  test("未選択時は手動入力の draft を使う", () => {
    expect(resolveAddFlowDraft(initialAddFlowDraftState, null)).toEqual({
      resolvedTitle: "",
      resolvedWorkType: "movie",
    });
  });
});
