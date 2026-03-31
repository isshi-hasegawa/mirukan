const supabaseMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("./supabase.ts", () => ({
  supabase: {
    functions: {
      invoke: supabaseMocks.invoke,
    },
  },
}));

import {
  fetchTmdbSeasonOptions,
  fetchTmdbSimilar,
  fetchTmdbTrending,
  fetchTmdbWorkDetails,
  resetTmdbRecommendationCachesForTest,
  resolveSeasonTitle,
  searchTmdbWorks,
} from "./tmdb.ts";
import { setupTestLifecycle } from "../test/test-lifecycle.ts";

setupTestLifecycle();

beforeEach(() => {
  resetTmdbRecommendationCachesForTest();
});

afterEach(() => {
  vi.restoreAllMocks();
  supabaseMocks.invoke.mockReset();
});

describe("resolveSeasonTitle", () => {
  test("generic Japanese season labels are prefixed with the series title", () => {
    expect(resolveSeasonTitle("コブラ会", 1, "シーズン1")).toBe("コブラ会 シーズン1");
  });

  test("generic English season labels are prefixed with the series title", () => {
    expect(resolveSeasonTitle("Cobra Kai", 2, "Season 2")).toBe("Cobra Kai シーズン2");
  });

  test("specific season title gets series prefix when series name is absent", () => {
    expect(resolveSeasonTitle("ブラック・ミラー", 6, "ジョーンはひどい人")).toBe(
      "ブラック・ミラー ジョーンはひどい人",
    );
  });

  test("season title already containing series name is kept as-is", () => {
    expect(resolveSeasonTitle("進撃の巨人", 4, "進撃の巨人 ファイナルシーズン")).toBe(
      "進撃の巨人 ファイナルシーズン",
    );
  });

  test("final season label without series name gets prefix", () => {
    expect(resolveSeasonTitle("進撃の巨人", 4, "ファイナルシーズン")).toBe(
      "進撃の巨人 ファイナルシーズン",
    );
  });

  test("falls back to series title when all candidates are blank", () => {
    expect(resolveSeasonTitle("コブラ会", 1, "", "   ", null, undefined)).toBe(
      "コブラ会 シーズン1",
    );
  });
});

describe("recommendation caches", () => {
  test("fetchTmdbSimilar caches per source item set", async () => {
    supabaseMocks.invoke.mockImplementation(async (name, options) => {
      const sourceItems =
        options?.body && "sourceItems" in options.body ? options.body.sourceItems : null;

      if (
        name === "fetch-tmdb-similar" &&
        Array.isArray(sourceItems) &&
        sourceItems[0]?.tmdbId === 1
      ) {
        return {
          data: [
            {
              tmdbId: 101,
              tmdbMediaType: "movie",
              workType: "movie",
              title: "Movie Similar A",
              originalTitle: "Movie Similar A",
              overview: "Movie Similar A overview",
              posterPath: null,
              releaseDate: "2025-01-01",
              jpWatchPlatforms: [],
              hasJapaneseRelease: true,
            },
          ],
          error: null,
        };
      }

      if (
        name === "fetch-tmdb-similar" &&
        Array.isArray(sourceItems) &&
        sourceItems[0]?.tmdbId === 2
      ) {
        return {
          data: [
            {
              tmdbId: 202,
              tmdbMediaType: "movie",
              workType: "movie",
              title: "Movie Similar B",
              originalTitle: "Movie Similar B",
              overview: "Movie Similar B overview",
              posterPath: null,
              releaseDate: "2025-01-01",
              jpWatchPlatforms: [],
              hasJapaneseRelease: true,
            },
          ],
          error: null,
        };
      }

      throw new Error(`Unexpected invoke: ${String(name)}`);
    });

    const first = await fetchTmdbSimilar([{ tmdbId: 1, tmdbMediaType: "movie" }]);
    const firstCached = await fetchTmdbSimilar([{ tmdbId: 1, tmdbMediaType: "movie" }]);
    const second = await fetchTmdbSimilar([{ tmdbId: 2, tmdbMediaType: "movie" }]);

    expect(first).toHaveLength(1);
    expect(first[0]?.tmdbId).toBe(101);
    expect(firstCached[0]?.tmdbId).toBe(101);
    expect(second).toHaveLength(1);
    expect(second[0]?.tmdbId).toBe(202);
    expect(
      supabaseMocks.invoke.mock.calls.filter(([name]) => name === "fetch-tmdb-similar"),
    ).toHaveLength(2);
  });

  test("fetchTmdbTrending keeps movie and tv entries with the same tmdb id", async () => {
    supabaseMocks.invoke.mockResolvedValue({
      data: [
        {
          tmdbId: 10,
          tmdbMediaType: "movie",
          workType: "movie",
          title: "Same Id Movie",
          originalTitle: "Same Id Movie",
          overview: "movie overview",
          posterPath: null,
          releaseDate: "2025-01-01",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
        {
          tmdbId: 10,
          tmdbMediaType: "tv",
          workType: "series",
          title: "Same Id TV",
          originalTitle: "Same Id TV",
          overview: "tv overview",
          posterPath: null,
          releaseDate: "2025-01-01",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
      ],
      error: null,
    });

    const results = await fetchTmdbTrending();

    expect(results.map((result) => `${result.tmdbMediaType}-${result.tmdbId}`).sort()).toEqual([
      "movie-10",
      "tv-10",
    ]);
  });

  test("fetchTmdbTrending reuses an in-flight request", async () => {
    type TrendingInvokeResult = { data: []; error: null };

    let resolveInvoke: ((value: TrendingInvokeResult) => void) | undefined;
    supabaseMocks.invoke.mockImplementation(
      () =>
        new Promise<TrendingInvokeResult>((resolve) => {
          resolveInvoke = resolve;
        }),
    );

    const first = fetchTmdbTrending();
    const second = fetchTmdbTrending();

    if (!resolveInvoke) {
      throw new Error("invoke resolver was not captured");
    }

    resolveInvoke({ data: [], error: null });
    await Promise.all([first, second]);

    expect(supabaseMocks.invoke).toHaveBeenCalledTimes(1);
  });
});

describe("API boundary wrappers", () => {
  test("searchTmdbWorks passes query and returns results", async () => {
    supabaseMocks.invoke.mockResolvedValue({
      data: [
        {
          tmdbId: 1,
          tmdbMediaType: "movie",
          workType: "movie",
          title: "Search Result",
          originalTitle: null,
          overview: null,
          posterPath: null,
          releaseDate: "2025-01-01",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
      ],
      error: null,
    });

    await expect(searchTmdbWorks("query text")).resolves.toEqual([
      expect.objectContaining({
        tmdbId: 1,
        title: "Search Result",
      }),
    ]);
    expect(supabaseMocks.invoke).toHaveBeenCalledWith("search-tmdb-works", {
      body: { query: "query text" },
    });
  });

  test("fetchTmdbSeasonOptions passes result and returns season options", async () => {
    const result = {
      tmdbId: 10,
      tmdbMediaType: "tv" as const,
      workType: "series" as const,
      title: "Series",
      originalTitle: "Series",
      overview: "overview",
      posterPath: null,
      releaseDate: "2024-01-01",
      jpWatchPlatforms: [],
      hasJapaneseRelease: true,
    };
    supabaseMocks.invoke.mockResolvedValue({
      data: [
        {
          seasonNumber: 2,
          title: "Series Season 2",
          overview: "season overview",
          posterPath: null,
          releaseDate: "2025-01-01",
          episodeCount: 8,
        },
      ],
      error: null,
    });

    await expect(fetchTmdbSeasonOptions(result)).resolves.toEqual([
      expect.objectContaining({
        seasonNumber: 2,
        title: "Series Season 2",
      }),
    ]);
    expect(supabaseMocks.invoke).toHaveBeenCalledWith("fetch-tmdb-season-options", {
      body: { result },
    });
  });

  test("fetchTmdbWorkDetails passes target and returns details", async () => {
    const target = {
      tmdbId: 20,
      tmdbMediaType: "tv" as const,
      workType: "season" as const,
      title: "Season 2",
      originalTitle: "Original Series",
      overview: "overview",
      posterPath: "/poster.jpg",
      releaseDate: "2025-01-01",
      seasonNumber: 2,
      episodeCount: 10,
      seriesTitle: "Series",
    };
    supabaseMocks.invoke.mockResolvedValue({
      data: {
        tmdbId: 20,
        tmdbMediaType: "tv",
        workType: "season",
        title: "Season 2",
        originalTitle: "Original Series",
        overview: "overview",
        posterPath: "/poster.jpg",
        releaseDate: "2025-01-01",
        genres: ["Drama"],
        runtimeMinutes: null,
        typicalEpisodeRuntimeMinutes: 50,
        episodeCount: 10,
        seasonCount: null,
        seasonNumber: 2,
      },
      error: null,
    });

    await expect(fetchTmdbWorkDetails(target)).resolves.toEqual(
      expect.objectContaining({
        tmdbId: 20,
        workType: "season",
        seasonNumber: 2,
      }),
    );
    expect(supabaseMocks.invoke).toHaveBeenCalledWith("fetch-tmdb-work-details", {
      body: { target },
    });
  });

  test("invoke error is surfaced as an exception", async () => {
    supabaseMocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "edge function failed" },
    });

    await expect(searchTmdbWorks("query text")).rejects.toThrow(
      "Supabase function search-tmdb-works failed: edge function failed",
    );
  });
});
