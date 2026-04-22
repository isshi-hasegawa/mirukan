const tmdbMocks = vi.hoisted(() => ({
  fetchTmdbWorkDetails: vi.fn(),
}));
const omdbMocks = vi.hoisted(() => ({
  fetchOmdbWorkDetails: vi.fn(),
}));

vi.mock("../../lib/tmdb.ts", async () => {
  const actual = await vi.importActual<typeof import("../../lib/tmdb.ts")>("../../lib/tmdb.ts");
  return {
    ...actual,
    // Keep the lib boundary mocked here so these tests focus on repository branching/state changes.
    fetchTmdbWorkDetails: tmdbMocks.fetchTmdbWorkDetails,
  };
});
vi.mock("../../lib/omdb.ts", () => ({
  fetchOmdbWorkDetails: omdbMocks.fetchOmdbWorkDetails,
}));

import { http, HttpResponse } from "msw";
import type {
  TmdbSearchResult,
  TmdbSeasonOption,
  TmdbSeasonSelectionTarget,
} from "../../lib/tmdb.ts";
import { getMockWorks, setMockWorks } from "../../test/mocks/handlers";
import { server } from "../../test/mocks/server";
import type { Work } from "../../test/mocks/types.ts";
import {
  createSeasonTmdbDetails,
  createSeriesTmdbDetails,
  createTmdbDetails,
} from "../../test/backlog-fixtures.ts";
import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import {
  buildSelectedSeasonTargets,
  resolveSelectedSeasonWorkIds,
  shouldRefreshOmdbWork,
  shouldRefreshTmdbWork,
  upsertManualWork,
  upsertTmdbWork,
} from "./work-repository.ts";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

setupTestLifecycle();

const sharedSeriesResult: TmdbSearchResult = {
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

const sharedSeasonOptions: TmdbSeasonOption[] = [
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
const TEST_USER_ID = "user-1";
const EXISTING_WORK_ID = "existing-work";

function createOmdbDetails() {
  return {
    rottenTomatoesScore: 93,
    imdbRating: 8.4,
    imdbVotes: 120000,
    metacriticScore: 78,
  };
}

function expectStoredWork(matcher: Partial<Work>) {
  expect(getMockWorks()).toContainEqual(expect.objectContaining(matcher));
}

function expectLinkedSeriesAndSeason(tmdbId: number, seasonNumber: number) {
  const works = getMockWorks();
  const seriesWork = works.find((work) => work.work_type === "series");
  const seasonWork = works.find((work) => work.work_type === "season");

  expect(seriesWork).toEqual(
    expect.objectContaining({
      tmdb_id: tmdbId,
      parent_work_id: null,
    }),
  );
  expect(seasonWork).toEqual(
    expect.objectContaining({
      tmdb_id: tmdbId,
      season_number: seasonNumber,
      parent_work_id: seriesWork?.id,
    }),
  );
}

function createManualMovieWork(overrides: Partial<Work> = {}): Partial<Work> {
  const baseWork: Partial<Work> = {
    id: EXISTING_WORK_ID,
    created_by: TEST_USER_ID,
    source_type: "manual",
    work_type: "movie",
    search_text: "テスト作品",
    tmdb_id: null,
    tmdb_media_type: null,
    title: "テスト作品",
    original_title: null,
    overview: null,
    poster_path: null,
    release_date: null,
    episode_count: null,
    season_number: null,
    series_title: null,
  };

  return {
    ...baseWork,
    ...overrides,
  };
}

function setExistingSeriesWork() {
  setMockWorks([
    {
      id: "series-work",
      source_type: "tmdb",
      work_type: "series",
      tmdb_media_type: "tv",
      tmdb_id: 100,
      title: "テストシリーズ",
      original_title: "Test Series",
      search_text: "test series",
      last_tmdb_synced_at: "2026-03-31T00:00:00.000Z",
      omdb_fetched_at: "2026-04-08T00:00:00.000Z",
      imdb_id: "tt0123456",
      episode_count: null,
      season_number: null,
      series_title: null,
    },
  ]);
}

function failSeasonLookup(seasonNumber: number) {
  server.use(
    http.get(`${SUPABASE_URL}/rest/v1/works`, ({ request }) => {
      const url = new URL(request.url);
      if (url.searchParams.get("season_number") === `eq.${seasonNumber}`) {
        return HttpResponse.json({ message: "season fetch failed" }, { status: 500 });
      }

      return undefined;
    }),
  );
}

beforeEach(() => {
  tmdbMocks.fetchTmdbWorkDetails.mockReset();
  omdbMocks.fetchOmdbWorkDetails.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildSelectedSeasonTargets", () => {
  test("シーズン1はシリーズとして扱い、重複を除いて昇順で返す", () => {
    const targets = buildSelectedSeasonTargets(
      sharedSeriesResult,
      sharedSeasonOptions,
      [3, 1, 3, 2],
    );

    expect(targets).toHaveLength(3);
    expect(targets[0]).toEqual(sharedSeriesResult);
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
    expect(() => buildSelectedSeasonTargets(sharedSeriesResult, sharedSeasonOptions, [4])).toThrow(
      "シーズン4の情報が見つかりません",
    );
  });
});

describe("shouldRefreshOmdbWork", () => {
  test("omdb_fetched_at が無ければ再取得する", () => {
    expect(shouldRefreshOmdbWork(null)).toBe(true);
  });

  test("十分新しければ再取得しない", () => {
    const now = Date.parse("2026-04-09T00:00:00.000Z");
    const omdbFetchedAt = "2026-04-05T00:00:00.000Z";

    expect(shouldRefreshOmdbWork(omdbFetchedAt, now)).toBe(false);
  });

  test("7日以上経過していれば再取得する", () => {
    const now = Date.parse("2026-04-09T00:00:00.000Z");
    const omdbFetchedAt = "2026-04-01T00:00:00.000Z";

    expect(shouldRefreshOmdbWork(omdbFetchedAt, now)).toBe(true);
  });

  test("不正な日付なら再取得する", () => {
    expect(shouldRefreshOmdbWork("not-a-date")).toBe(true);
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
  const existingTmdbWorkResponse = {
    success: true,
    data: { id: EXISTING_WORK_ID },
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
  } as const;

  function setExistingMovieWork(overrides: Partial<Work> = {}) {
    setMockWorks([
      {
        id: EXISTING_WORK_ID,
        source_type: "tmdb",
        work_type: "movie",
        tmdb_media_type: "movie",
        tmdb_id: movieTarget.tmdbId,
        title: "既存作品",
        original_title: "Existing Movie",
        search_text: "existing movie",
        episode_count: null,
        season_number: null,
        series_title: null,
        ...overrides,
      },
    ]);
  }

  async function expectExistingMovieResult(result: ReturnType<typeof upsertTmdbWork>) {
    await expect(result).resolves.toEqual(existingTmdbWorkResponse);
  }

  test("十分新しい既存作品は再同期せず再利用する", async () => {
    setExistingMovieWork({
      last_tmdb_synced_at: "2026-03-31T00:00:00.000Z",
      omdb_fetched_at: "2026-04-08T00:00:00.000Z",
      imdb_id: "tt0123456",
    });

    await expectExistingMovieResult(upsertTmdbWork(movieTarget, TEST_USER_ID));
    expect(tmdbMocks.fetchTmdbWorkDetails).not.toHaveBeenCalled();
  });

  test("期限切れの既存作品は詳細を再取得して update する", async () => {
    setExistingMovieWork({
      last_tmdb_synced_at: "2026-01-01T00:00:00.000Z",
    });
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValue(
      createTmdbDetails({
        tmdbId: movieTarget.tmdbId,
        title: "更新後タイトル",
        originalTitle: movieTarget.originalTitle,
      }),
    );

    await expectExistingMovieResult(upsertTmdbWork(movieTarget, TEST_USER_ID));
    expect(tmdbMocks.fetchTmdbWorkDetails).toHaveBeenCalledWith(movieTarget);
    expectStoredWork({
      id: EXISTING_WORK_ID,
      title: "更新後タイトル",
      original_title: "Test Movie",
    });
  });

  test("external_ids 取得失敗時は既存の imdb_id を消さない", async () => {
    setExistingMovieWork({
      last_tmdb_synced_at: "2026-01-01T00:00:00.000Z",
      imdb_id: "tt0123456",
    });
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValue(
      createTmdbDetails({
        tmdbId: movieTarget.tmdbId,
        title: "更新後タイトル",
        originalTitle: movieTarget.originalTitle,
        imdbId: undefined,
      }),
    );

    await expectExistingMovieResult(upsertTmdbWork(movieTarget, TEST_USER_ID));

    expectStoredWork({
      id: EXISTING_WORK_ID,
      imdb_id: "tt0123456",
    });
  });

  test("TMDb が新しくても imdb_id 未保存かつ OMDb 未取得なら詳細を再取得して OMDb を保存する", async () => {
    setExistingMovieWork({
      last_tmdb_synced_at: "2026-04-08T00:00:00.000Z",
      omdb_fetched_at: null,
      imdb_id: null,
    });
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValue(
      createTmdbDetails({
        tmdbId: movieTarget.tmdbId,
        title: "更新後タイトル",
        originalTitle: movieTarget.originalTitle,
        imdbId: "tt7654321",
      }),
    );
    omdbMocks.fetchOmdbWorkDetails.mockResolvedValue(createOmdbDetails());

    await expectExistingMovieResult(upsertTmdbWork(movieTarget, TEST_USER_ID));

    expect(tmdbMocks.fetchTmdbWorkDetails).toHaveBeenCalledWith(movieTarget);
    expect(omdbMocks.fetchOmdbWorkDetails).toHaveBeenCalledWith("tt7654321");
    expectStoredWork({
      id: EXISTING_WORK_ID,
      imdb_id: "tt7654321",
      rotten_tomatoes_score: 93,
      imdb_rating: 8.4,
      imdb_votes: 120000,
      metacritic_score: 78,
    });
  });

  test("IMDb ID が無い作品でも OMDb 未取得時の確認結果を記録する", async () => {
    setExistingMovieWork({
      last_tmdb_synced_at: "2026-04-08T00:00:00.000Z",
      omdb_fetched_at: null,
      imdb_id: null,
    });
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValue(
      createTmdbDetails({
        tmdbId: movieTarget.tmdbId,
        title: "更新後タイトル",
        originalTitle: movieTarget.originalTitle,
        imdbId: null,
      }),
    );

    await expectExistingMovieResult(upsertTmdbWork(movieTarget, TEST_USER_ID));

    expect(omdbMocks.fetchOmdbWorkDetails).not.toHaveBeenCalled();
    expectStoredWork({
      id: EXISTING_WORK_ID,
      imdb_id: null,
      rotten_tomatoes_score: null,
      imdb_rating: null,
      imdb_votes: null,
      metacritic_score: null,
      omdb_fetched_at: expect.any(String),
    });
  });

  test("TMDb 再同期で imdb_id が変わったら OMDb を即時再取得する", async () => {
    setExistingMovieWork({
      last_tmdb_synced_at: "2026-01-01T00:00:00.000Z",
      omdb_fetched_at: "2026-04-08T00:00:00.000Z",
      imdb_id: "tt0123456",
    });
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValue(
      createTmdbDetails({
        tmdbId: movieTarget.tmdbId,
        title: "更新後タイトル",
        originalTitle: movieTarget.originalTitle,
        imdbId: "tt7654321",
      }),
    );
    omdbMocks.fetchOmdbWorkDetails.mockResolvedValue(createOmdbDetails());

    await expectExistingMovieResult(upsertTmdbWork(movieTarget, TEST_USER_ID));

    expect(omdbMocks.fetchOmdbWorkDetails).toHaveBeenCalledWith("tt7654321");
    expectStoredWork({
      id: EXISTING_WORK_ID,
      imdb_id: "tt7654321",
      rotten_tomatoes_score: 93,
    });
  });

  test("シーズン追加時は親 series を先に解決してから insert する", async () => {
    tmdbMocks.fetchTmdbWorkDetails
      .mockResolvedValueOnce(
        createSeriesTmdbDetails(
          {
            tmdbId: seasonTarget.tmdbId,
            title: seasonTarget.seriesTitle,
            originalTitle: seasonTarget.originalTitle,
          },
          3,
        ),
      )
      .mockResolvedValueOnce(
        createSeasonTmdbDetails(
          { tmdbId: seasonTarget.tmdbId, originalTitle: seasonTarget.originalTitle },
          {
            seasonNumber: seasonTarget.seasonNumber,
            title: seasonTarget.title,
            overview: seasonTarget.overview,
            posterPath: seasonTarget.posterPath,
            releaseDate: seasonTarget.releaseDate,
            episodeCount: seasonTarget.episodeCount,
          },
        ),
      );

    await expect(upsertTmdbWork(seasonTarget, TEST_USER_ID)).resolves.toMatchObject({
      data: { id: expect.any(String) },
      error: null,
      status: 201,
    });
    expect(tmdbMocks.fetchTmdbWorkDetails).toHaveBeenCalledTimes(2);
    expectLinkedSeriesAndSeason(300, 2);
  });
});

describe("resolveSelectedSeasonWorkIds", () => {
  test("空入力時はエラーを返す", async () => {
    await expect(
      resolveSelectedSeasonWorkIds(sharedSeriesResult, TEST_USER_ID, [], {
        seasonOptions: sharedSeasonOptions,
      }),
    ).resolves.toEqual({
      error: "追加するシーズンを1つ以上選択してください",
      workIds: [],
    });
  });

  test("シーズン情報組み立て失敗時はエラーを返す", async () => {
    await expect(
      resolveSelectedSeasonWorkIds(sharedSeriesResult, TEST_USER_ID, [4], {
        seasonOptions: sharedSeasonOptions,
      }),
    ).resolves.toEqual({
      error: "シーズン4の情報が見つかりません",
      workIds: [],
    });
  });

  test("シーズン1のみ選択時は series を保存して返す", async () => {
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValueOnce(
      createSeriesTmdbDetails(sharedSeriesResult, 3),
    );

    await expect(
      resolveSelectedSeasonWorkIds(sharedSeriesResult, TEST_USER_ID, [1], {
        seasonOptions: sharedSeasonOptions,
      }),
    ).resolves.toMatchObject({
      error: null,
      workIds: [expect.any(String)],
    });
    expect(tmdbMocks.fetchTmdbWorkDetails).toHaveBeenCalledTimes(1);
    expectStoredWork({
      work_type: "series",
      tmdb_id: sharedSeriesResult.tmdbId,
    });
  });

  test("複数シーズン追加時は親 series を一度だけ解決して workIds を順序どおり返す", async () => {
    tmdbMocks.fetchTmdbWorkDetails
      .mockResolvedValueOnce(createSeriesTmdbDetails(sharedSeriesResult, 2))
      .mockResolvedValueOnce(createSeasonTmdbDetails(sharedSeriesResult, sharedSeasonOptions[0]));

    const result = await resolveSelectedSeasonWorkIds(sharedSeriesResult, TEST_USER_ID, [1, 2], {
      seasonOptions: sharedSeasonOptions,
    });

    expect(result.error).toBeNull();
    expect(tmdbMocks.fetchTmdbWorkDetails).toHaveBeenCalledTimes(2);
    expectLinkedSeriesAndSeason(sharedSeriesResult.tmdbId, 2);

    const works = getMockWorks();
    const seriesWork = works.find((work) => work.work_type === "series");
    const seasonWork = works.find((work) => work.work_type === "season");
    expect(result.workIds).toEqual([seriesWork?.id, seasonWork?.id]);
  });

  test("途中の保存に失敗したら workIds を返さず打ち切る", async () => {
    setExistingSeriesWork();
    failSeasonLookup(2);

    await expect(
      resolveSelectedSeasonWorkIds(sharedSeriesResult, TEST_USER_ID, [1, 2], {
        seasonOptions: sharedSeasonOptions,
      }),
    ).resolves.toEqual({
      error: "season fetch failed",
      workIds: [],
    });
    expect(tmdbMocks.fetchTmdbWorkDetails).not.toHaveBeenCalled();
  });

  test("途中の保存に失敗したら後続シーズンの保存を発行しない", async () => {
    setExistingSeriesWork();
    failSeasonLookup(2);
    tmdbMocks.fetchTmdbWorkDetails.mockResolvedValue(
      createSeasonTmdbDetails(sharedSeriesResult, sharedSeasonOptions[1]),
    );

    await expect(
      resolveSelectedSeasonWorkIds(sharedSeriesResult, TEST_USER_ID, [2, 3], {
        seasonOptions: sharedSeasonOptions,
      }),
    ).resolves.toEqual({
      error: "season fetch failed",
      workIds: [],
    });

    expect(tmdbMocks.fetchTmdbWorkDetails).not.toHaveBeenCalled();
    expect(getMockWorks()).not.toContainEqual(expect.objectContaining({ season_number: 3 }));
  });
});

describe("upsertManualWork", () => {
  test("既存ヒット時は再利用する", async () => {
    setMockWorks([createManualMovieWork()]);

    await expect(upsertManualWork("テスト作品", "movie", TEST_USER_ID)).resolves.toMatchObject({
      data: { id: EXISTING_WORK_ID },
      error: null,
      status: 200,
    });
  });

  test("insert 成功時は新規 id を返す", async () => {
    await expect(upsertManualWork("テスト作品", "movie", TEST_USER_ID)).resolves.toMatchObject({
      data: { id: expect.any(String) },
      error: null,
      status: 201,
    });
  });

  test("23505 競合後は再 select で救済する", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/works`, async ({ request }) => {
        const body = (await request.json()) as { created_by: string; search_text: string };
        setMockWorks([
          createManualMovieWork({
            id: "rescued-work",
            created_by: body.created_by,
            search_text: body.search_text,
          }),
        ]);
        return HttpResponse.json(
          { message: "duplicate key value", code: "23505" },
          { status: 409 },
        );
      }),
    );

    await expect(upsertManualWork("テスト作品", "movie", TEST_USER_ID)).resolves.toEqual({
      success: true,
      data: { id: "rescued-work" },
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });
  });

  test("競合後の再 select 失敗時は conflict を返す", async () => {
    let insertSeen = false;
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/works`, () => {
        insertSeen = true;
        return HttpResponse.json(
          { message: "duplicate key value", code: "23505" },
          { status: 409 },
        );
      }),
      http.get(`${SUPABASE_URL}/rest/v1/works`, ({ request }) => {
        if (!insertSeen) {
          return undefined;
        }

        const url = new URL(request.url);
        if (url.searchParams.get("source_type") === "eq.manual") {
          return HttpResponse.json({ message: "reselect failed" }, { status: 500 });
        }

        return undefined;
      }),
    );

    await expect(upsertManualWork("テスト作品", "movie", TEST_USER_ID)).resolves.toEqual({
      success: false,
      data: null,
      error: { message: "reselect failed" },
      count: null,
      status: 409,
      statusText: "Conflict",
    });
  });
});
