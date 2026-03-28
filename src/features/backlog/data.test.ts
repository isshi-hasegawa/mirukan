import { describe, expect, test } from "vite-plus/test";
import {
  calcCompletionLoadScore,
  getNextSortOrder,
  getSortOrderForDrop,
  getSortOrderForStatusChange,
} from "./data.ts";
import type { BacklogItem } from "./types.ts";
import type { TmdbWorkDetails } from "../../lib/tmdb.ts";

function createItem(id: string, status: BacklogItem["status"], sortOrder: number): BacklogItem {
  return {
    id,
    status,
    display_title: null,
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
