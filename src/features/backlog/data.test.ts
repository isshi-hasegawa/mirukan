const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

const tmdbMocks = vi.hoisted(() => ({
  fetchTmdbWorkDetails: vi.fn(),
}));

vi.mock("../../lib/supabase.ts", () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

vi.mock("../../lib/tmdb.ts", async () => {
  const actual = await vi.importActual<typeof import("../../lib/tmdb.ts")>("../../lib/tmdb.ts");
  return {
    ...actual,
    fetchTmdbWorkDetails: tmdbMocks.fetchTmdbWorkDetails,
  };
});

import {
  applyBacklogItemUpdate,
  applyModeFilter,
  buildDetailFieldUpdate,
  buildMoveToStatusConfirmMessage,
  buildSelectedSeasonTargets,
  calcCompletionLoadScore,
  getNextSortOrder,
  getSortOrderForDrop,
  getSortOrderForStatusChange,
  normalizeBacklogItems,
  planBacklogItemUpserts,
  resolveSelectedSeasonWorkIds,
  shouldRefreshTmdbWork,
  sortStackedItemsByViewingMode,
  upsertBacklogItemsToStatus,
  upsertManualWork,
} from "./data.ts";
import type { BacklogItem, WorkSummary } from "./types.ts";
import type { TmdbSearchResult, TmdbSeasonOption, TmdbWorkDetails } from "../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../test/test-lifecycle.ts";

setupTestLifecycle();

type MaybeSingleResult = {
  data: { id: string; last_tmdb_synced_at?: string | null } | null;
  error: { message: string; code?: string } | null;
};

type SingleResult = {
  data: { id: string } | null;
  error: { message: string; code?: string } | null;
  count: null;
  status: number;
  statusText: string;
};

function createWorksTableMock({
  maybeSingleResults = [],
  singleResults = [],
}: {
  maybeSingleResults?: MaybeSingleResult[];
  singleResults?: SingleResult[];
}) {
  const selectChain = {
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  selectChain.eq.mockImplementation(() => selectChain);
  selectChain.maybeSingle.mockImplementation(async () => {
    const result = maybeSingleResults.shift();
    if (!result) {
      throw new Error("Unexpected maybeSingle call");
    }
    return result;
  });

  const insertChain = {
    select: vi.fn(),
    single: vi.fn(),
  };
  insertChain.select.mockImplementation(() => insertChain);
  insertChain.single.mockImplementation(async () => {
    const result = singleResults.shift();
    if (!result) {
      throw new Error("Unexpected single call");
    }
    return result;
  });

  return {
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => insertChain),
    selectChain,
    insertChain,
  };
}

function createBacklogItemsTableMock(error: { message: string } | null = null) {
  return {
    upsert: vi.fn(async () => ({ error })),
  };
}

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

beforeEach(() => {
  supabaseMocks.from.mockReset();
  tmdbMocks.fetchTmdbWorkDetails.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe("buildDetailFieldUpdate", () => {
  test("platform 編集では正規化した primary_platform を返す", () => {
    expect(buildDetailFieldUpdate("primaryPlatform", "netflix")).toEqual({
      primary_platform: "netflix",
    });
  });

  test("note 編集では trim 後の文字列を返す", () => {
    expect(buildDetailFieldUpdate("note", "  メモ  ")).toEqual({
      note: "メモ",
    });
  });

  test("空 note は null を返す", () => {
    expect(buildDetailFieldUpdate("note", "   ")).toEqual({
      note: null,
    });
  });
});

describe("applyBacklogItemUpdate", () => {
  test("BacklogItem へ部分更新を反映する", () => {
    const item = createItem("a", "stacked", 1000);

    expect(
      applyBacklogItemUpdate(item, {
        status: "watched",
        sort_order: 2000,
        primary_platform: "netflix",
        note: "メモ",
      }),
    ).toMatchObject({
      id: "a",
      status: "watched",
      sort_order: 2000,
      primary_platform: "netflix",
      note: "メモ",
    });
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

describe("shouldRefreshTmdbWork", () => {
  test("last_synced が無ければ再同期する", () => {
    expect(shouldRefreshTmdbWork(null)).toBe(true);
  });

  test("十分新しければ再同期しない", () => {
    const now = Date.parse("2026-04-01T00:00:00.000Z");
    const lastSyncedAt = "2026-03-15T00:00:00.000Z";

    expect(shouldRefreshTmdbWork(lastSyncedAt, now)).toBe(false);
  });

  test("30日以上経過していれば再同期する", () => {
    const now = Date.parse("2026-04-01T00:00:00.000Z");
    const lastSyncedAt = "2026-02-28T00:00:00.000Z";

    expect(shouldRefreshTmdbWork(lastSyncedAt, now)).toBe(true);
  });

  test("不正な日付なら再同期する", () => {
    expect(shouldRefreshTmdbWork("not-a-date")).toBe(true);
  });
});

describe("resolveSelectedSeasonWorkIds", () => {
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
  ];

  test("空入力時はエラーを返す", async () => {
    await expect(
      resolveSelectedSeasonWorkIds(seriesResult, "user-1", [], { seasonOptions }),
    ).resolves.toEqual({
      error: "追加するシーズンを1つ以上選択してください",
      workIds: [],
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  test("シーズン情報組み立て失敗時はエラーを返す", async () => {
    await expect(
      resolveSelectedSeasonWorkIds(seriesResult, "user-1", [3], { seasonOptions }),
    ).resolves.toEqual({
      error: "シーズン3の情報が見つかりません",
      workIds: [],
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  test("途中の保存に失敗したら workIds を返さず打ち切る", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [
        {
          data: { id: "series-work", last_tmdb_synced_at: "2026-03-31T00:00:00.000Z" },
          error: null,
        },
        {
          data: { id: "series-work", last_tmdb_synced_at: "2026-03-31T00:00:00.000Z" },
          error: null,
        },
        {
          data: null,
          error: { message: "season fetch failed" },
        },
      ],
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "works") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return worksTable;
    });

    await expect(
      resolveSelectedSeasonWorkIds(seriesResult, "user-1", [1, 2], { seasonOptions }),
    ).resolves.toEqual({
      error: "season fetch failed",
      workIds: [],
    });
    expect(worksTable.selectChain.maybeSingle).toHaveBeenCalledTimes(3);
    expect(tmdbMocks.fetchTmdbWorkDetails).not.toHaveBeenCalled();
  });
});

describe("upsertBacklogItemsToStatus", () => {
  test("空入力または action なしなら no-op", async () => {
    await expect(
      upsertBacklogItemsToStatus("user-1", [], [], "stacked", {
        note: null,
        primaryPlatform: null,
      }),
    ).resolves.toEqual({ error: null });

    await expect(
      upsertBacklogItemsToStatus(
        "user-1",
        [createItem("a", "stacked", 1000, "work-1")],
        ["work-1"],
        "stacked",
        {
          note: "ignored",
          primaryPlatform: "netflix",
        },
      ),
    ).resolves.toEqual({ error: null });

    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  test("insert と move が混在しても先頭側から sort_order を振る", async () => {
    const backlogItemsTable = createBacklogItemsTableMock();
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "backlog_items") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return backlogItemsTable;
    });

    const items = [
      createItem("existing-top", "stacked", 3000, "work-top"),
      createItem("move-me", "watching", 1000, "work-move"),
    ];

    await expect(
      upsertBacklogItemsToStatus("user-1", items, ["work-move", "work-new"], "stacked", {
        note: "新規メモ",
        primaryPlatform: "netflix",
      }),
    ).resolves.toEqual({ error: null });

    expect(backlogItemsTable.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: "user-1",
          work_id: "work-move",
          status: "stacked",
          primary_platform: null,
          note: null,
          sort_order: 2000,
        },
        {
          user_id: "user-1",
          work_id: "work-new",
          status: "stacked",
          primary_platform: "netflix",
          note: "新規メモ",
          sort_order: 3000,
        },
      ],
      { onConflict: "user_id,work_id" },
    );
  });

  test("upsert 失敗時はエラーを返す", async () => {
    const backlogItemsTable = createBacklogItemsTableMock({ message: "save failed" });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "backlog_items") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return backlogItemsTable;
    });

    await expect(
      upsertBacklogItemsToStatus(
        "user-1",
        [createItem("move-me", "watching", 1000, "work-move")],
        ["work-move"],
        "stacked",
        {
          note: null,
          primaryPlatform: null,
        },
      ),
    ).resolves.toEqual({ error: "save failed" });
  });
});

describe("upsertManualWork", () => {
  test("既存ヒット時は再利用する", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [{ data: { id: "existing-work" }, error: null }],
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "works") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return worksTable;
    });

    await expect(upsertManualWork("テスト作品", "movie", "user-1")).resolves.toMatchObject({
      data: { id: "existing-work" },
      error: null,
      status: 200,
    });
    expect(worksTable.insert).not.toHaveBeenCalled();
  });

  test("insert 成功時は新規 id を返す", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [{ data: null, error: null }],
      singleResults: [
        {
          data: { id: "inserted-work" },
          error: null,
          count: null,
          status: 201,
          statusText: "Created",
        },
      ],
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "works") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return worksTable;
    });

    await expect(upsertManualWork("テスト作品", "movie", "user-1")).resolves.toMatchObject({
      data: { id: "inserted-work" },
      error: null,
      status: 201,
    });
  });

  test("23505 競合後は再 select で救済する", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [
        { data: null, error: null },
        { data: { id: "rescued-work" }, error: null },
      ],
      singleResults: [
        {
          data: null,
          error: { message: "duplicate key value", code: "23505" },
          count: null,
          status: 409,
          statusText: "Conflict",
        },
      ],
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "works") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return worksTable;
    });

    await expect(upsertManualWork("テスト作品", "movie", "user-1")).resolves.toEqual({
      data: { id: "rescued-work" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
  });

  test("競合後の再 select 失敗時は conflict を返す", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [
        { data: null, error: null },
        { data: null, error: { message: "reselect failed" } },
      ],
      singleResults: [
        {
          data: null,
          error: { message: "duplicate key value", code: "23505" },
          count: null,
          status: 409,
          statusText: "Conflict",
        },
      ],
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "works") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return worksTable;
    });

    await expect(upsertManualWork("テスト作品", "movie", "user-1")).resolves.toEqual({
      data: null,
      error: { message: "reselect failed" },
      count: null,
      status: 409,
      statusText: "Conflict",
    });
  });
});
