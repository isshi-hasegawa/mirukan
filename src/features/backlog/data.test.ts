import { describe, expect, test } from "vite-plus/test";
import {
  applyModeFilter,
  buildMoveToStatusConfirmMessage,
  buildSelectedSeasonTargets,
  calcCompletionLoadScore,
  getNextSortOrder,
  getSortOrderForDrop,
  getSortOrderForStatusChange,
  normalizeBacklogItems,
  planBacklogItemUpserts,
  sortStackedItemsByViewingMode,
} from "./data.ts";
import type { BacklogItem, WorkSummary } from "./types.ts";
import type { TmdbSearchResult, TmdbSeasonOption, TmdbWorkDetails } from "../../lib/tmdb.ts";

function createItem(
  id: string,
  status: BacklogItem["status"],
  sortOrder: number,
  workId = `work-${id}`,
): BacklogItem {
  return {
    id,
    status,
    primary_platform: null,
    note: null,
    sort_order: sortOrder,
    works: {
      id: workId,
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

describe("planBacklogItemUpserts", () => {
  test("新規追加と既存カード移動と既存ストックを振り分ける", () => {
    const items = [
      createItem("a", "stacked", 1000, "work-1"),
      createItem("b", "watched", 2000, "work-2"),
    ];

    const result = planBacklogItemUpserts(items, ["work-1", "work-2", "work-3"], "stacked");

    expect(result.actions).toEqual([
      { type: "move", item: items[1] },
      { type: "insert", workId: "work-3" },
    ]);
    expect(result.existingTargetItems).toEqual([items[0]]);
    expect(result.existingOtherItems).toEqual([items[1]]);
  });
});

describe("buildMoveToStatusConfirmMessage", () => {
  test("重複カードの状態をまとめて確認文を作る", () => {
    const items = [
      createItem("a", "watched", 1000),
      createItem("b", "interrupted", 2000),
      createItem("c", "watched", 3000),
    ];

    expect(buildMoveToStatusConfirmMessage(items, "stacked", "シーズン1・シーズン2")).toBe(
      "シーズン1・シーズン2はすでに「視聴済み・中断」にあります。ストックに戻しますか？",
    );
  });
});

describe("buildSelectedSeasonTargets", () => {
  const seriesResult: TmdbSearchResult = {
    tmdbId: 100,
    tmdbMediaType: "tv",
    workType: "series",
    title: "テストシリーズ",
    originalTitle: "Test Series",
    overview: "overview",
    posterPath: "/poster.jpg",
    releaseDate: "2024-01-01",
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
  };

  const seasonOptions: TmdbSeasonOption[] = [
    {
      seasonNumber: 2,
      title: "テストシリーズ シーズン2",
      overview: "season 2",
      posterPath: "/season2.jpg",
      releaseDate: "2025-01-01",
      episodeCount: 8,
    },
    {
      seasonNumber: 3,
      title: "テストシリーズ シーズン3",
      overview: "season 3",
      posterPath: "/season3.jpg",
      releaseDate: "2026-01-01",
      episodeCount: 10,
    },
  ];

  test("シーズン1はシリーズとして扱い、重複を除いて昇順で返す", () => {
    const targets = buildSelectedSeasonTargets(seriesResult, seasonOptions, [3, 1, 3, 2]);

    expect(targets).toHaveLength(3);
    expect(targets[0]).toEqual(seriesResult);
    expect(targets[1]).toMatchObject({
      workType: "season",
      seasonNumber: 2,
      title: "テストシリーズ シーズン2",
    });
    expect(targets[2]).toMatchObject({
      workType: "season",
      seasonNumber: 3,
      title: "テストシリーズ シーズン3",
    });
  });

  test("不足しているシーズン情報を選ぶと例外を投げる", () => {
    expect(() => buildSelectedSeasonTargets(seriesResult, seasonOptions, [4])).toThrow(
      "シーズン4の情報が見つかりません",
    );
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

describe("sortStackedItemsByViewingMode", () => {
  test("選択中ラベルのカードだけ先頭に寄せて、それ以外は元の順番を保つ", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "stacked", 2000),
      createItem("c", "stacked", 3000),
      createItem("d", "stacked", 4000),
    ];

    items[0].works = createWork({ id: "wa", runtime_minutes: 95 });
    items[1].works = createWork({ id: "wb", runtime_minutes: 25 });
    items[2].works = createWork({ id: "wc", runtime_minutes: 110 });
    items[3].works = createWork({ id: "wd", runtime_minutes: 55 });

    expect(sortStackedItemsByViewingMode(items, "focus").map((item) => item.id)).toEqual([
      "a",
      "c",
      "b",
      "d",
    ]);
  });

  test("未選択なら既存の順番をそのまま返す", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "stacked", 2000),
      createItem("c", "stacked", 3000),
    ];

    expect(sortStackedItemsByViewingMode(items, null).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
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
