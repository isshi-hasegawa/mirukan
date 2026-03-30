import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import {
  fetchTmdbSimilar,
  fetchTmdbTrending,
  resetTmdbRecommendationCachesForTest,
  resolveSeasonTitle,
} from "./tmdb.ts";

function createJsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function resolveFetchUrl(input: RequestInfo | URL): URL {
  if (typeof input === "string") {
    return new URL(input);
  }

  if (input instanceof URL) {
    return input;
  }

  return new URL(input.url);
}

function buildTrendingPayload(
  results: Array<{ id: number; mediaType: "movie" | "tv"; title: string }>,
) {
  return {
    results: results.map((result) => ({
      id: result.id,
      media_type: result.mediaType,
      title: result.mediaType === "movie" ? result.title : undefined,
      name: result.mediaType === "tv" ? result.title : undefined,
      original_title: result.mediaType === "movie" ? result.title : undefined,
      original_name: result.mediaType === "tv" ? result.title : undefined,
      overview: `${result.title} overview`,
      poster_path: null,
      release_date: result.mediaType === "movie" ? "2025-01-01" : undefined,
      first_air_date: result.mediaType === "tv" ? "2025-01-01" : undefined,
    })),
  };
}

function buildSimilarPayload(id: number, mediaType: "movie" | "tv", title: string) {
  return {
    results: [
      {
        id,
        title: mediaType === "movie" ? title : undefined,
        name: mediaType === "tv" ? title : undefined,
        original_title: mediaType === "movie" ? title : undefined,
        original_name: mediaType === "tv" ? title : undefined,
        overview: `${title} overview`,
        poster_path: null,
        release_date: mediaType === "movie" ? "2025-01-01" : undefined,
        first_air_date: mediaType === "tv" ? "2025-01-01" : undefined,
      },
    ],
  };
}

beforeEach(() => {
  resetTmdbRecommendationCachesForTest();
});

afterEach(() => {
  vi.restoreAllMocks();
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
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = resolveFetchUrl(input);

      if (url.pathname === "/3/movie/1/similar") {
        return createJsonResponse(buildSimilarPayload(101, "movie", "Movie Similar A"));
      }

      if (url.pathname === "/3/movie/2/similar") {
        return createJsonResponse(buildSimilarPayload(202, "movie", "Movie Similar B"));
      }

      if (url.pathname.endsWith("/watch/providers")) {
        return createJsonResponse({ results: {} });
      }

      if (url.pathname.endsWith("/release_dates")) {
        return createJsonResponse({
          results: [{ iso_3166_1: "JP", release_dates: [{ release_date: "2025-01-01" }] }],
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    });

    const first = await fetchTmdbSimilar([{ tmdbId: 1, tmdbMediaType: "movie" }]);
    const second = await fetchTmdbSimilar([{ tmdbId: 2, tmdbMediaType: "movie" }]);

    expect(first).toHaveLength(1);
    expect(first[0]?.tmdbId).toBe(101);
    expect(second).toHaveLength(1);
    expect(second[0]?.tmdbId).toBe(202);
    const calledPaths = fetchMock.mock.calls.map(([input]) => resolveFetchUrl(input).pathname);
    expect(calledPaths).toContain("/3/movie/1/similar");
    expect(calledPaths).toContain("/3/movie/2/similar");
  });

  test("fetchTmdbTrending keeps movie and tv entries with the same tmdb id", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = resolveFetchUrl(input);

      if (url.pathname === "/3/trending/all/week") {
        const page = url.searchParams.get("page");
        if (page === "1") {
          return createJsonResponse(
            buildTrendingPayload([
              { id: 10, mediaType: "movie", title: "Same Id Movie" },
              { id: 10, mediaType: "tv", title: "Same Id TV" },
            ]),
          );
        }
        return createJsonResponse({ results: [] });
      }

      if (url.pathname.endsWith("/watch/providers")) {
        return createJsonResponse({ results: {} });
      }

      if (url.pathname.endsWith("/release_dates")) {
        return createJsonResponse({
          results: [{ iso_3166_1: "JP", release_dates: [{ release_date: "2025-01-01" }] }],
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    });

    const results = await fetchTmdbTrending();

    expect(results.map((result) => `${result.tmdbMediaType}-${result.tmdbId}`).sort()).toEqual([
      "movie-10",
      "tv-10",
    ]);
  });

  test("fetchTmdbTrending reuses an in-flight request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = resolveFetchUrl(input);

      if (url.pathname === "/3/trending/all/week") {
        return createJsonResponse({ results: [] });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    });

    await Promise.all([fetchTmdbTrending(), fetchTmdbTrending()]);

    const trendingCalls = fetchMock.mock.calls.filter(([input]) => {
      const url = resolveFetchUrl(input);
      return url.pathname === "/3/trending/all/week";
    });

    expect(trendingCalls).toHaveLength(3);
  });
});
