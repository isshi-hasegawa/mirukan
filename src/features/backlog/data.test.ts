import { describe, expect, test } from "vite-plus/test";
import {
  applyModeFilter,
  calcCompletionLoadScore,
  getNextSortOrder,
  getSortOrderForDrop,
  getSortOrderForStatusChange,
  normalizeBacklogItems,
} from "./data.ts";
import type { BacklogItem, WorkSummary } from "./types.ts";
import type { TmdbWorkDetails } from "../../lib/tmdb.ts";

function createItem(id: string, status: BacklogItem["status"], sortOrder: number): BacklogItem {
  return {
    id,
    status,
    primary_platform: null,
    note: null,
    sort_order: sortOrder,
    works: {
      id: `work-${id}`,
      title: `Title ${id}`,
      work_type: "movie",
      source_type: "manual",
      tmdb_id: null,
      tmdb_media_type: null,
      original_title: null,
      overview: null,
      poster_path: null,
      release_date: null,
      runtime_minutes: null,
      typical_episode_runtime_minutes: null,
      duration_bucket: null,
      genres: [],
      season_count: null,
      season_number: null,
      focus_required_score: null,
      background_fit_score: null,
      completion_load_score: null,
    },
  };
}

function makeDetails(
  workType: TmdbWorkDetails["workType"],
  runtimeMinutes: number | null,
  typicalEpisodeRuntimeMinutes: number | null,
): TmdbWorkDetails {
  return {
    tmdbId: 1,
    tmdbMediaType: workType === "movie" ? "movie" : "tv",
    workType,
    title: "test",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: null,
    genres: [],
    runtimeMinutes,
    typicalEpisodeRuntimeMinutes,
    episodeCount: null,
    seasonCount: null,
    seasonNumber: null,
  };
}

describe("calcCompletionLoadScore", () => {
  describe("movie: 全体尺ベース", () => {
    test("short (≤30分) → 0", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 20, null))).toBe(0);
    });
    test("medium (≤70分) → 25", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 60, null))).toBe(25);
    });
    test("long (≤120分) → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 90, null))).toBe(50);
    });
    test("very_long (>120分) → 75", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 150, null))).toBe(75);
    });
    test("尺不明 → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", null, null))).toBe(50);
    });
  });

  describe("season/series: 1話尺ベース", () => {
    test("アニメ1話20分 → 0", () => {
      expect(calcCompletionLoadScore(makeDetails("season", null, 20))).toBe(0);
    });
    test("ドラマ1話45分 → 25", () => {
      expect(calcCompletionLoadScore(makeDetails("season", null, 45))).toBe(25);
    });
    test("長尺エピソード90分 → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("series", null, 90))).toBe(50);
    });
    test("1話尺不明 → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("season", null, null))).toBe(50);
    });
  });
});

describe("getNextSortOrder", () => {
  test("appends by 1000 within the same status", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "stacked", 2000),
      createItem("c", "watched", 1000),
    ];

    expect(getNextSortOrder(items, "stacked")).toBe(3000);
    expect(getNextSortOrder(items, "watching")).toBe(1000);
  });
});

describe("getSortOrderForDrop", () => {
  test("places a card between neighboring cards in the same column", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "stacked", 2000),
      createItem("c", "stacked", 3000),
    ];

    expect(getSortOrderForDrop(items, "a", "stacked", "c", "before")).toBe(2500);
  });

  test("moves a card to the start of a target column", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "watching", 1000),
      createItem("c", "watching", 2000),
    ];

    expect(getSortOrderForDrop(items, "a", "watching", "b", "before")).toBe(0);
  });

  test("moves a card to the end of an empty target column", () => {
    const items = [createItem("a", "stacked", 1000)];

    expect(getSortOrderForDrop(items, "a", "watched", null, "after")).toBe(1000);
  });
});

describe("getSortOrderForStatusChange", () => {
  test("keeps the current sort order when the status does not change", () => {
    const items = [createItem("a", "stacked", 1000), createItem("b", "watched", 1000)];

    expect(getSortOrderForStatusChange(items, "a", "stacked")).toBe(1000);
  });

  test("moves the item to the end of the target column when the status changes", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "watched", 1000),
      createItem("c", "watched", 2000),
    ];

    expect(getSortOrderForStatusChange(items, "a", "watched")).toBe(3000);
  });
});

function createWork(overrides: Partial<WorkSummary> = {}): WorkSummary {
  return {
    id: "w1",
    title: "Test",
    work_type: "movie",
    source_type: "tmdb",
    tmdb_id: 1,
    tmdb_media_type: "movie",
    original_title: null,
    overview: null,
    poster_path: null,
    release_date: null,
    runtime_minutes: null,
    typical_episode_runtime_minutes: null,
    duration_bucket: null,
    genres: [],
    season_count: null,
    season_number: null,
    focus_required_score: null,
    background_fit_score: null,
    completion_load_score: null,
    ...overrides,
  };
}

describe("applyModeFilter", () => {
  describe("focus モード (≥80分)", () => {
    test("映画80分以上 → true", () => {
      expect(applyModeFilter(createWork({ runtime_minutes: 120 }), "focus")).toBe(true);
    });
    test("映画79分 → false", () => {
      expect(applyModeFilter(createWork({ runtime_minutes: 79 }), "focus")).toBe(false);
    });
    test("シリーズ1話80分 → true", () => {
      expect(
        applyModeFilter(
          createWork({ work_type: "series", typical_episode_runtime_minutes: 80 }),
          "focus",
        ),
      ).toBe(true);
    });
    test("尺不明 → false", () => {
      expect(applyModeFilter(createWork(), "focus")).toBe(false);
    });
  });

  describe("thoughtful モード (40-79分)", () => {
    test("映画50分 → true", () => {
      expect(applyModeFilter(createWork({ runtime_minutes: 50 }), "thoughtful")).toBe(true);
    });
    test("映画39分 → false", () => {
      expect(applyModeFilter(createWork({ runtime_minutes: 39 }), "thoughtful")).toBe(false);
    });
    test("映画80分 → false", () => {
      expect(applyModeFilter(createWork({ runtime_minutes: 80 }), "thoughtful")).toBe(false);
    });
  });

  describe("quick モード (<40分)", () => {
    test("映画30分 → true", () => {
      expect(applyModeFilter(createWork({ runtime_minutes: 30 }), "quick")).toBe(true);
    });
    test("映画40分 → false", () => {
      expect(applyModeFilter(createWork({ runtime_minutes: 40 }), "quick")).toBe(false);
    });
  });

  describe("background モード (background_fit_score ≥50)", () => {
    test("スコア75 → true", () => {
      expect(applyModeFilter(createWork({ background_fit_score: 75 }), "background")).toBe(true);
    });
    test("スコア50 → true", () => {
      expect(applyModeFilter(createWork({ background_fit_score: 50 }), "background")).toBe(true);
    });
    test("スコア25 → false", () => {
      expect(applyModeFilter(createWork({ background_fit_score: 25 }), "background")).toBe(false);
    });
    test("スコア null → false", () => {
      expect(applyModeFilter(createWork({ background_fit_score: null }), "background")).toBe(false);
    });
  });
});

describe("normalizeBacklogItems", () => {
  test("flattens nested work arrays into single works", () => {
    const rows = [
      {
        id: "1",
        status: "stacked",
        primary_platform: null,
        note: null,
        sort_order: 1000,
        works: [createWork({ id: "w1" })],
      },
    ];
    const result = normalizeBacklogItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].works).toEqual(createWork({ id: "w1" }));
  });

  test("passes through single work objects", () => {
    const rows = [
      {
        id: "1",
        status: "stacked",
        primary_platform: null,
        note: null,
        sort_order: 1000,
        works: createWork({ id: "w1" }),
      },
    ];
    const result = normalizeBacklogItems(rows);
    expect(result).toHaveLength(1);
    expect(result[0].works).toEqual(createWork({ id: "w1" }));
  });

  test("excludes rows with null works", () => {
    const rows = [
      {
        id: "1",
        status: "stacked",
        primary_platform: null,
        note: null,
        sort_order: 1000,
        works: null,
      },
    ];
    expect(normalizeBacklogItems(rows)).toHaveLength(0);
  });
});
