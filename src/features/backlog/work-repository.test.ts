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

import type {
  TmdbSearchResult,
  TmdbSeasonOption,
  TmdbSeasonSelectionTarget,
  TmdbWorkDetails,
} from "../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import {
  buildSelectedSeasonTargets,
  resolveSelectedSeasonWorkIds,
  shouldRefreshTmdbWork,
  upsertManualWork,
  upsertTmdbWork,
} from "./work-repository.ts";

setupTestLifecycle();

type MaybeSingleResult = {
  data: { id: string; last_tmdb_synced_at?: string | null } | null;
  error: { message: string; code?: string } | null;
};

type SingleResult = {
  success?: boolean;
  data: { id: string } | null;
  error: { message: string; code?: string } | null;
  count: null;
  status: number;
  statusText: string;
};

type UpdateResult = {
  error: { message: string; code?: string } | null;
};

function createWorksTableMock({
  maybeSingleResults = [],
  singleResults = [],
  updateResults = [],
}: {
  maybeSingleResults?: MaybeSingleResult[];
  singleResults?: SingleResult[];
  updateResults?: UpdateResult[];
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
    return {
      ...result,
      success: result.success ?? result.error === null,
    };
  });

  const updateChain = {
    eq: vi.fn(),
  };
  updateChain.eq.mockImplementation(async () => {
    const result = updateResults.shift();
    if (!result) {
      throw new Error("Unexpected update call");
    }
    return result;
  });

  return {
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
    selectChain,
    insertChain,
    updateChain,
  };
}

function createTmdbDetails(overrides: Partial<TmdbWorkDetails> = {}): TmdbWorkDetails {
  return {
    tmdbId: 1,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "テスト作品",
    originalTitle: "Test Work",
    overview: "overview",
    posterPath: "/poster.jpg",
    releaseDate: "2024-01-01",
    genres: ["ドラマ"],
    runtimeMinutes: 120,
    typicalEpisodeRuntimeMinutes: null,
    episodeCount: null,
    seasonCount: null,
    seasonNumber: null,
    ...overrides,
  };
}

beforeEach(() => {
  supabaseMocks.from.mockReset();
  tmdbMocks.fetchTmdbWorkDetails.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
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

describe("upsertTmdbWork", () => {
  const movieTarget: TmdbSearchResult = {
    tmdbId: 200,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "テスト映画",
    originalTitle: "Test Movie",
    overview: "overview",
    posterPath: "/movie.jpg",
    releaseDate: "2024-01-01",
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
  };

  const seasonTarget: TmdbSeasonSelectionTarget = {
    tmdbId: 300,
    tmdbMediaType: "tv",
    workType: "season",
    title: "テストシリーズ シーズン2",
    originalTitle: "Test Series",
    overview: "season overview",
    posterPath: "/season.jpg",
    releaseDate: "2025-01-01",
    seasonNumber: 2,
    episodeCount: 8,
    seriesTitle: "テストシリーズ",
  };

  test("十分新しい既存作品は再同期せず再利用する", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [
        {
          data: { id: "existing-work", last_tmdb_synced_at: "2026-03-31T00:00:00.000Z" },
          error: null,
        },
      ],
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "works") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return worksTable;
    });

    await expect(upsertTmdbWork(movieTarget, "user-1")).resolves.toEqual({
      success: true,
      data: { id: "existing-work" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    expect(tmdbMocks.fetchTmdbWorkDetails).not.toHaveBeenCalled();
    expect(worksTable.update).not.toHaveBeenCalled();
    expect(worksTable.insert).not.toHaveBeenCalled();
  });

  test("期限切れの既存作品は詳細を再取得して update する", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [
        {
          data: { id: "existing-work", last_tmdb_synced_at: "2026-01-01T00:00:00.000Z" },
          error: null,
        },
      ],
      updateResults: [{ error: null }],
    });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "works") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return worksTable;
    });
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValue(
      createTmdbDetails({
        tmdbId: movieTarget.tmdbId,
        title: "更新後タイトル",
        originalTitle: movieTarget.originalTitle,
      }),
    );

    await expect(upsertTmdbWork(movieTarget, "user-1")).resolves.toEqual({
      success: true,
      data: { id: "existing-work" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
    expect(tmdbMocks.fetchTmdbWorkDetails).toHaveBeenCalledWith(movieTarget);
    expect(worksTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "更新後タイトル",
        original_title: "Test Movie",
      }),
    );
    expect(worksTable.updateChain.eq).toHaveBeenCalledWith("id", "existing-work");
  });

  test("シーズン追加時は親 series を先に解決してから insert する", async () => {
    const worksTable = createWorksTableMock({
      maybeSingleResults: [
        { data: null, error: null },
        { data: null, error: null },
      ],
      singleResults: [
        {
          data: { id: "series-work" },
          error: null,
          count: null,
          status: 201,
          statusText: "Created",
        },
        {
          data: { id: "season-work" },
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
    tmdbMocks.fetchTmdbWorkDetails
      .mockResolvedValueOnce(
        createTmdbDetails({
          tmdbId: seasonTarget.tmdbId,
          tmdbMediaType: "tv",
          workType: "series",
          title: seasonTarget.seriesTitle,
          originalTitle: seasonTarget.originalTitle,
          runtimeMinutes: null,
          typicalEpisodeRuntimeMinutes: 48,
          seasonCount: 3,
        }),
      )
      .mockResolvedValueOnce(
        createTmdbDetails({
          tmdbId: seasonTarget.tmdbId,
          tmdbMediaType: "tv",
          workType: "season",
          title: seasonTarget.title,
          originalTitle: seasonTarget.originalTitle,
          overview: seasonTarget.overview,
          posterPath: seasonTarget.posterPath,
          releaseDate: seasonTarget.releaseDate,
          runtimeMinutes: null,
          typicalEpisodeRuntimeMinutes: 48,
          episodeCount: seasonTarget.episodeCount,
          seasonNumber: seasonTarget.seasonNumber,
        }),
      );

    await expect(upsertTmdbWork(seasonTarget, "user-1")).resolves.toEqual({
      success: true,
      data: { id: "season-work" },
      error: null,
      count: null,
      status: 201,
      statusText: "Created",
    });
    expect(tmdbMocks.fetchTmdbWorkDetails).toHaveBeenCalledTimes(2);
    expect(worksTable.insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        work_type: "series",
        parent_work_id: null,
      }),
    );
    expect(worksTable.insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        work_type: "season",
        parent_work_id: "series-work",
        season_number: 2,
      }),
    );
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
      success: true,
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
      success: false,
      data: null,
      error: { message: "reselect failed" },
      count: null,
      status: 409,
      statusText: "Conflict",
    });
  });
});
