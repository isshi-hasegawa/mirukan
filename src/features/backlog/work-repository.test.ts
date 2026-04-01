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

import type { TmdbSearchResult, TmdbSeasonOption, TmdbWorkDetails } from "../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import {
  buildSelectedSeasonTargets,
  calcCompletionLoadScore,
  resolveSelectedSeasonWorkIds,
  shouldRefreshTmdbWork,
  upsertManualWork,
} from "./work-repository.ts";

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
