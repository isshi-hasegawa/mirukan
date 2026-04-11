import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import { createBacklogItem, createWorkSummary } from "../../test/backlog-fixtures.ts";
import {
  buildDuplicateState,
  buildTvSelectionState,
  getStackedSeasonNumbers,
  mergeSeasonNumbers,
} from "./tmdb-search-state.ts";
import type { BacklogItem } from "./types.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";

setupTestLifecycle();

function createSearchResult(
  overrides: Partial<TmdbSearchResult> & Pick<TmdbSearchResult, "tmdbId" | "title">,
): TmdbSearchResult {
  return {
    tmdbMediaType: "tv",
    workType: "series",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: "2024-01-01",
    jpWatchPlatforms: [],
    hasJapaneseRelease: false,
    ...overrides,
  };
}

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return createBacklogItem(overrides, {
    title: "既存作品",
    work_type: "series",
    tmdb_media_type: "tv",
    release_date: "2024-01-01",
    season_count: 2,
  });
}

describe("mergeSeasonNumbers", () => {
  test("選択済みとストック済みを重複なく昇順でまとめる", () => {
    expect(mergeSeasonNumbers([3, 1, 2], [2, 4])).toEqual([1, 2, 3, 4]);
  });
});

describe("getStackedSeasonNumbers", () => {
  test("ストック済みシーズンだけを返す", () => {
    const result = createSearchResult({ tmdbId: 10, title: "シリーズ" });
    const items = [
      createItem({
        works: { ...createItem().works!, tmdb_id: 10, season_count: 3 },
      }),
      createItem({
        id: "item-2",
        works: {
          ...createItem().works!,
          id: "work-2",
          tmdb_id: 10,
          work_type: "season",
          season_number: 2,
        },
      }),
      createItem({
        id: "item-3",
        status: "watched",
        works: {
          ...createItem().works!,
          id: "work-3",
          tmdb_id: 10,
          work_type: "season",
          season_number: 3,
        },
      }),
    ];

    expect(getStackedSeasonNumbers(items, result, [1, 2, 3])).toEqual([1, 2]);
  });
});

describe("buildDuplicateState", () => {
  test("視聴済みシーズンはストックへ戻せる状態を返す", () => {
    const result = createSearchResult({ tmdbId: 20, title: "シリーズ" });
    const items = [
      createItem({
        status: "watched",
        works: { ...createItem().works!, tmdb_id: 20 },
      }),
    ];

    expect(buildDuplicateState(items, result, [1])).toEqual({
      canAddToStacked: true,
    });
  });

  test("ストック済みシーズンだけなら追加不可を返す", () => {
    const result = createSearchResult({ tmdbId: 21, title: "シリーズ" });
    const items = [
      createItem({
        works: { ...createItem().works!, tmdb_id: 21 },
      }),
    ];

    expect(buildDuplicateState(items, result, [1])).toEqual({
      canAddToStacked: false,
    });
  });
});

describe("buildTvSelectionState", () => {
  test("選択シーズンに応じた duplicate 状態をまとめる", () => {
    const result = createSearchResult({ tmdbId: 30, title: "シリーズ" });
    const items = [
      createItem({
        status: "watched",
        works: { ...createItem().works!, tmdb_id: 30 },
      }),
    ];

    expect(buildTvSelectionState(items, result, [1])).toEqual({
      selectedSeasonNumbers: [1],
      canAddSelectionToStacked: true,
    });
  });
});
