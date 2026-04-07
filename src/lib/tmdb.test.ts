import { http, HttpResponse } from "msw";
import {
  fetchTmdbRecommendations,
  fetchTmdbSeasonOptions,
  fetchTmdbSimilar,
  fetchTmdbTrending,
  fetchTmdbWorkDetails,
  resetTmdbRecommendationCachesForTest,
  resolveSeasonTitle,
  searchTmdbWorks,
} from "./tmdb.ts";
import { setupTestLifecycle } from "../test/test-lifecycle.ts";
import {
  setMockTmdbSeasonOptions,
  setMockTmdbSimilarResults,
  setMockTmdbTrendingResults,
  setMockTmdbWorkDetails,
} from "../test/mocks/handlers";
import { server } from "../test/mocks/server";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

setupTestLifecycle();

beforeEach(() => {
  resetTmdbRecommendationCachesForTest();
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
  test("fetchTmdbRecommendations returns similar first and fills the rest with trending", async () => {
    setMockTmdbSimilarResults(
      [{ tmdbId: 1, tmdbMediaType: "movie" }],
      [
        {
          tmdbId: 101,
          tmdbMediaType: "movie",
          workType: "movie",
          title: "Similar A",
          originalTitle: "Similar A",
          overview: "similar overview",
          posterPath: null,
          releaseDate: "2025-01-01",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
      ],
    );
    setMockTmdbTrendingResults([
      {
        tmdbId: 101,
        tmdbMediaType: "movie",
        workType: "movie",
        title: "Similar A",
        originalTitle: "Similar A",
        overview: "duplicate",
        posterPath: null,
        releaseDate: "2025-01-01",
        jpWatchPlatforms: [],
        hasJapaneseRelease: true,
      },
      {
        tmdbId: 202,
        tmdbMediaType: "tv",
        workType: "series",
        title: "Trending B",
        originalTitle: "Trending B",
        overview: "trending overview",
        posterPath: null,
        releaseDate: "2025-01-01",
        jpWatchPlatforms: [],
        hasJapaneseRelease: true,
      },
    ]);

    const results = await fetchTmdbRecommendations([{ tmdbId: 1, tmdbMediaType: "movie" }]);

    expect(results.map((result) => `${result.tmdbMediaType}-${result.tmdbId}`)).toEqual([
      "movie-101",
      "tv-202",
    ]);
  });

  test("fetchTmdbSimilar caches per source item set", async () => {
    setMockTmdbSimilarResults(
      [{ tmdbId: 1, tmdbMediaType: "movie" }],
      [
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
    );
    setMockTmdbSimilarResults(
      [{ tmdbId: 2, tmdbMediaType: "movie" }],
      [
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
    );

    const first = await fetchTmdbSimilar([{ tmdbId: 1, tmdbMediaType: "movie" }]);
    const firstCached = await fetchTmdbSimilar([{ tmdbId: 1, tmdbMediaType: "movie" }]);
    const second = await fetchTmdbSimilar([{ tmdbId: 2, tmdbMediaType: "movie" }]);

    expect(first[0]?.tmdbId).toBe(101);
    expect(firstCached[0]?.tmdbId).toBe(101);
    expect(second[0]?.tmdbId).toBe(202);
  });

  test("fetchTmdbSimilar sends at most 8 unique source items", async () => {
    let receivedSourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }> = [];
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-similar`, async ({ request }) => {
        const body = (await request.json()) as {
          sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>;
        };
        receivedSourceItems = body.sourceItems;
        return HttpResponse.json([]);
      }),
    );

    await fetchTmdbSimilar([
      { tmdbId: 1, tmdbMediaType: "movie" },
      { tmdbId: 2, tmdbMediaType: "movie" },
      { tmdbId: 3, tmdbMediaType: "movie" },
      { tmdbId: 4, tmdbMediaType: "movie" },
      { tmdbId: 5, tmdbMediaType: "movie" },
      { tmdbId: 6, tmdbMediaType: "movie" },
      { tmdbId: 7, tmdbMediaType: "movie" },
      { tmdbId: 8, tmdbMediaType: "movie" },
      { tmdbId: 9, tmdbMediaType: "movie" },
      { tmdbId: 1, tmdbMediaType: "movie" },
    ]);

    expect(receivedSourceItems).toEqual([
      { tmdbId: 1, tmdbMediaType: "movie" },
      { tmdbId: 2, tmdbMediaType: "movie" },
      { tmdbId: 3, tmdbMediaType: "movie" },
      { tmdbId: 4, tmdbMediaType: "movie" },
      { tmdbId: 5, tmdbMediaType: "movie" },
      { tmdbId: 6, tmdbMediaType: "movie" },
      { tmdbId: 7, tmdbMediaType: "movie" },
      { tmdbId: 8, tmdbMediaType: "movie" },
    ]);
  });

  test("fetchTmdbSimilar reuses cache for the same source item set in different order", async () => {
    let requestCount = 0;
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-similar`, async () => {
        requestCount += 1;
        return HttpResponse.json([
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
        ]);
      }),
    );

    await fetchTmdbSimilar([
      { tmdbId: 1, tmdbMediaType: "movie" },
      { tmdbId: 2, tmdbMediaType: "tv" },
    ]);
    await fetchTmdbSimilar([
      { tmdbId: 2, tmdbMediaType: "tv" },
      { tmdbId: 1, tmdbMediaType: "movie" },
    ]);

    expect(requestCount).toBe(1);
  });

  test("fetchTmdbTrending keeps movie and tv entries with the same tmdb id", async () => {
    setMockTmdbTrendingResults([
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
    ]);

    const results = await fetchTmdbTrending();

    expect(results.map((result) => `${result.tmdbMediaType}-${result.tmdbId}`).sort()).toEqual([
      "movie-10",
      "tv-10",
    ]);
  });

  test("fetchTmdbTrending reuses an in-flight request", async () => {
    let resolveRequest: ((value: Response) => void) | undefined;
    let requestCount = 0;
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-trending`, () => {
        requestCount += 1;
        return new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        });
      }),
    );

    const first = fetchTmdbTrending();
    const second = fetchTmdbTrending();

    await vi.waitFor(() => {
      expect(resolveRequest).toBeTypeOf("function");
    });

    resolveRequest!(HttpResponse.json([]));
    await Promise.all([first, second]);

    expect(requestCount).toBe(1);
  });
});

describe("API boundary wrappers", () => {
  const seasonResult = {
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

  const workDetailsTarget = {
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

  test("searchTmdbWorks passes query and returns results", async () => {
    let receivedQuery = "";
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/search-tmdb-works`, async ({ request }) => {
        const body = (await request.json()) as { query: string };
        receivedQuery = body.query;
        return HttpResponse.json([
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
        ]);
      }),
    );

    await expect(searchTmdbWorks("query text")).resolves.toEqual([
      expect.objectContaining({
        tmdbId: 1,
        title: "Search Result",
      }),
    ]);
    expect(receivedQuery).toBe("query text");
  });

  test("fetchTmdbSeasonOptions passes result and returns season options", async () => {
    setMockTmdbSeasonOptions(seasonResult, [
      {
        seasonNumber: 2,
        title: "Series Season 2",
        overview: "season overview",
        posterPath: null,
        releaseDate: "2025-01-01",
        episodeCount: 8,
      },
    ]);

    await expect(fetchTmdbSeasonOptions(seasonResult)).resolves.toEqual([
      expect.objectContaining({
        seasonNumber: 2,
        title: "Series Season 2",
      }),
    ]);
  });

  test("fetchTmdbWorkDetails passes target and returns details", async () => {
    setMockTmdbWorkDetails(workDetailsTarget, {
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
    });

    await expect(fetchTmdbWorkDetails(workDetailsTarget)).resolves.toEqual(
      expect.objectContaining({
        tmdbId: 20,
        workType: "season",
        seasonNumber: 2,
      }),
    );
  });

  test("non-2xx response is surfaced as an exception", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/search-tmdb-works`, () => {
        return HttpResponse.json({ message: "edge function failed" }, { status: 500 });
      }),
    );

    await expect(searchTmdbWorks("query text")).rejects.toThrow(
      "Supabase function search-tmdb-works failed: Edge Function returned a non-2xx status code",
    );
  });

  test("relay error message is surfaced as an exception", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/search-tmdb-works`, () => {
        return new HttpResponse(null, {
          status: 503,
          headers: { "x-relay-error": "true" },
        });
      }),
    );

    await expect(searchTmdbWorks("query text")).rejects.toThrow(
      "Supabase function search-tmdb-works failed: Relay Error invoking the Edge Function",
    );
  });

  test("searchTmdbWorks rejects malformed response data", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/search-tmdb-works`, () => {
        return HttpResponse.json({ results: [] });
      }),
    );

    await expect(searchTmdbWorks("query text")).rejects.toThrow(
      "Supabase function search-tmdb-works returned invalid data",
    );
  });

  test("fetchTmdbSeasonOptions rejects empty response data", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-season-options`, () => {
        return HttpResponse.json(null);
      }),
    );

    await expect(fetchTmdbSeasonOptions(seasonResult)).rejects.toThrow(
      "Supabase function fetch-tmdb-season-options returned invalid data",
    );
  });

  test("fetchTmdbWorkDetails rejects empty response data", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-work-details`, () => {
        return HttpResponse.json(null);
      }),
    );

    await expect(fetchTmdbWorkDetails(workDetailsTarget)).rejects.toThrow(
      "Supabase function fetch-tmdb-work-details returned invalid data",
    );
  });
});
