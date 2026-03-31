import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
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
  fetchTmdbSimilar,
  fetchTmdbTrending,
  resetTmdbRecommendationCachesForTest,
  resolveSeasonTitle,
} from "./tmdb.ts";

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
    let resolveInvoke: ((value: { data: []; error: null }) => void) | null = null;
    supabaseMocks.invoke.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInvoke = resolve;
        }),
    );

    const first = fetchTmdbTrending();
    const second = fetchTmdbTrending();

    resolveInvoke?.({ data: [], error: null });
    await Promise.all([first, second]);

    expect(supabaseMocks.invoke).toHaveBeenCalledTimes(1);
  });
});
