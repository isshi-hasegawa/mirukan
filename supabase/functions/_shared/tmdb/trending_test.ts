import { assertEquals } from "jsr:@std/assert";
import { jsonResponse, withEnv, withMockFetch, withSupabaseAdminEnv } from "../test-helpers.ts";
import { createMovieResult, createSeriesResult } from "./test-fixtures.ts";
import {
  futureIso,
  pastIso,
  respondWithEmptyMetadataCache,
  withSupabaseTmdbEnv,
} from "./test-helpers.ts";
import { fetchTmdbTrending } from "./trending.ts";

function isTmdbRequest(url: URL, pathname: string): boolean {
  return url.hostname === "api.themoviedb.org" && url.pathname === pathname;
}

function handleTrendingFetch(url: URL): Response {
  if (isTmdbRequest(url, "/3/trending/all/week")) {
    const page = url.searchParams.get("page");
    if (page === "1") {
      return jsonResponse({
        results: [
          {
            id: 31,
            media_type: "movie",
            title: "Movie One",
            original_title: "Movie One Original",
            overview: "movie overview",
            poster_path: "/movie-one.jpg",
            release_date: "2024-01-01",
          },
        ],
      });
    }

    if (page === "2") {
      return jsonResponse({
        results: [
          {
            id: 31,
            media_type: "movie",
            title: "Movie One",
            original_title: "Movie One Original",
            overview: "movie overview",
            poster_path: "/movie-one.jpg",
            release_date: "2024-01-01",
          },
          {
            id: 32,
            media_type: "tv",
            name: "Show Two",
            original_name: "Show Two Original",
            overview: "series overview",
            poster_path: "/show-two.jpg",
            first_air_date: "2024-02-01",
          },
        ],
      });
    }

    return jsonResponse({
      results: [{ id: 99, media_type: "person", name: "ignored" }],
    });
  }

  if (isTmdbRequest(url, "/3/movie/31/watch/providers")) {
    return jsonResponse({
      results: {
        JP: {
          flatrate: [{ provider_id: 97, provider_name: "U-NEXT", logo_path: "/u.png" }],
        },
      },
    });
  }

  if (isTmdbRequest(url, "/3/movie/31/release_dates")) {
    return jsonResponse({
      results: [
        {
          iso_3166_1: "JP",
          release_dates: [{ release_date: "2024-01-10" }],
        },
      ],
    });
  }

  if (isTmdbRequest(url, "/3/movie/31/external_ids")) {
    return jsonResponse({ imdb_id: "tt0000031" });
  }

  if (url.hostname === "www.omdbapi.com" && url.searchParams.get("i") === "tt0000031") {
    return jsonResponse({
      Response: "True",
      Ratings: [{ Source: "Rotten Tomatoes", Value: "88%" }],
    });
  }

  if (isTmdbRequest(url, "/3/tv/32/watch/providers")) {
    return jsonResponse({
      results: {
        JP: {
          flatrate: [{ provider_id: 337, provider_name: "Disney+", logo_path: "/d.png" }],
        },
      },
    });
  }

  if (isTmdbRequest(url, "/3/tv/32/external_ids")) {
    return jsonResponse({}, { status: 503 });
  }

  throw new Error(`Unhandled fetch: ${url.toString()}`);
}

type TrendingRefreshState = {
  deleteCalls: number;
  inserts: unknown[];
};

async function handleTrendingCacheRefreshRequest(
  url: URL,
  request: Request,
  state: TrendingRefreshState,
): Promise<Response | null> {
  if (url.pathname !== "/rest/v1/tmdb_trending_cache") {
    return null;
  }

  if (request.method === "GET") {
    return jsonResponse([
      {
        rank: 0,
        payload: createMovieResult({ tmdbId: 999, title: "Stale" }),
        expires_at: pastIso(),
      },
    ]);
  }

  if (request.method === "DELETE") {
    state.deleteCalls += 1;
    return jsonResponse([]);
  }

  if (request.method === "POST") {
    state.inserts.push(JSON.parse(await request.text()));
    return jsonResponse([], { status: 201 });
  }

  return null;
}

function handleTrendingPageFetch(url: URL): Response | null {
  if (!isTmdbRequest(url, "/3/trending/all/week")) {
    return null;
  }

  const page = url.searchParams.get("page");
  if (page === "1") {
    return jsonResponse({
      results: [
        {
          id: 31,
          media_type: "movie",
          title: "Movie One",
          original_title: "Movie One Original",
          overview: "movie overview",
          poster_path: "/movie-one.jpg",
          release_date: "2024-01-01",
        },
      ],
    });
  }

  if (page === "2") {
    return jsonResponse({
      results: [
        {
          id: 32,
          media_type: "tv",
          name: "Show Two",
          original_name: "Show Two Original",
          overview: "series overview",
          poster_path: "/show-two.jpg",
          first_air_date: "2024-02-01",
        },
      ],
    });
  }

  return jsonResponse({ results: [] });
}

function handleTrendingMovieFetch(url: URL): Response | null {
  if (isTmdbRequest(url, "/3/movie/31/watch/providers")) {
    return jsonResponse({
      results: {
        JP: {
          flatrate: [{ provider_id: 97, provider_name: "U-NEXT", logo_path: "/u.png" }],
        },
      },
    });
  }

  if (isTmdbRequest(url, "/3/movie/31/release_dates")) {
    return jsonResponse({
      results: [
        {
          iso_3166_1: "JP",
          release_dates: [{ release_date: "2024-01-10" }],
        },
      ],
    });
  }

  if (isTmdbRequest(url, "/3/movie/31/external_ids")) {
    return jsonResponse({ imdb_id: null });
  }

  return null;
}

function handleTrendingSeriesFetch(url: URL): Response | null {
  if (isTmdbRequest(url, "/3/tv/32/watch/providers")) {
    return jsonResponse({
      results: {
        JP: {
          flatrate: [{ provider_id: 337, provider_name: "Disney+", logo_path: "/d.png" }],
        },
      },
    });
  }

  if (isTmdbRequest(url, "/3/tv/32/external_ids")) {
    return jsonResponse({ imdb_id: null });
  }

  return null;
}

function handleTrendingRefreshTmdbFetch(url: URL): Response | null {
  return (
    handleTrendingPageFetch(url) ?? handleTrendingMovieFetch(url) ?? handleTrendingSeriesFetch(url)
  );
}

async function handleTrendingRefreshFetch(
  url: URL,
  init: RequestInit | undefined,
  state: TrendingRefreshState,
): Promise<Response> {
  const request = new Request(url, init);
  const response =
    (await handleTrendingCacheRefreshRequest(url, request, state)) ??
    respondWithEmptyMetadataCache(url, request) ??
    handleTrendingRefreshTmdbFetch(url);

  if (response) {
    return response;
  }

  throw new Error(`Unhandled fetch: ${request.method} ${url.toString()}`);
}

function handleStaleTrendingCacheRead(
  url: URL,
  request: Request,
  staleResult: ReturnType<typeof createMovieResult>,
): Response | null {
  if (url.pathname !== "/rest/v1/tmdb_trending_cache" || request.method !== "GET") {
    return null;
  }

  return jsonResponse([
    {
      rank: 0,
      payload: staleResult,
      expires_at: pastIso(),
    },
  ]);
}

async function handleTrendingFailureFetch(
  url: URL,
  init: RequestInit | undefined,
  staleResult: ReturnType<typeof createMovieResult>,
): Promise<Response> {
  const request = new Request(url, init);
  const cacheResponse = handleStaleTrendingCacheRead(url, request, staleResult);
  if (cacheResponse) {
    return cacheResponse;
  }

  if (isTmdbRequest(url, "/3/trending/all/week")) {
    throw new Error("tmdb down");
  }

  throw new Error(`Unhandled fetch: ${request.method} ${url.toString()}`);
}

Deno.test("fetchTmdbTrending は 3 ページを集約して重複を除外する", async () => {
  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      OMDB_API_KEY: "omdb-test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        (url) => handleTrendingFetch(url),
        async () => {
          const results = await fetchTmdbTrending();

          assertEquals(results, [
            {
              tmdbId: 31,
              tmdbMediaType: "movie",
              workType: "movie",
              title: "Movie One",
              originalTitle: "Movie One Original",
              overview: "movie overview",
              posterPath: "/movie-one.jpg",
              releaseDate: "2024-01-01",
              jpWatchPlatforms: [{ key: "u_next", logoPath: "/u.png" }],
              hasJapaneseRelease: true,
              rottenTomatoesScore: 88,
            },
            {
              tmdbId: 32,
              tmdbMediaType: "tv",
              workType: "series",
              title: "Show Two",
              originalTitle: "Show Two Original",
              overview: "series overview",
              posterPath: "/show-two.jpg",
              releaseDate: "2024-02-01",
              jpWatchPlatforms: [{ key: "disney_plus", logoPath: "/d.png" }],
              hasJapaneseRelease: true,
              rottenTomatoesScore: null,
            },
          ]);
        },
      );
    },
  );
});

Deno.test("fetchTmdbTrending は fresh cache があればそれを返す", async () => {
  await withSupabaseAdminEnv(async () => {
    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);
        assertEquals(request.method, "GET");
        assertEquals(url.pathname, "/rest/v1/tmdb_trending_cache");
        assertEquals(url.searchParams.get("cache_window"), "eq.week");
        assertEquals(url.searchParams.get("order"), "rank.asc");

        return jsonResponse([
          { rank: 0, payload: null, expires_at: futureIso() },
          {
            rank: 1,
            payload: createMovieResult({ tmdbId: 201, title: "Cached Movie" }),
            expires_at: futureIso(),
          },
          {
            rank: 2,
            payload: createSeriesResult({ tmdbId: 202, title: "Cached Show" }),
            expires_at: futureIso(),
          },
        ]);
      },
      async () => {
        assertEquals(await fetchTmdbTrending(), [
          createMovieResult({ tmdbId: 201, title: "Cached Movie" }),
          createSeriesResult({ tmdbId: 202, title: "Cached Show" }),
        ]);
      },
    );
  });
});

Deno.test("fetchTmdbTrending は stale cache を refresh して trending cache を更新する", async () => {
  await withSupabaseTmdbEnv(async () => {
    const state: TrendingRefreshState = {
      deleteCalls: 0,
      inserts: [],
    };

    await withMockFetch(
      (url, init) => handleTrendingRefreshFetch(url, init, state),
      async () => {
        assertEquals(await fetchTmdbTrending(), [
          createMovieResult({
            tmdbId: 31,
            title: "Movie One",
            originalTitle: "Movie One Original",
            overview: "movie overview",
            posterPath: "/movie-one.jpg",
            releaseDate: "2024-01-01",
            jpWatchPlatforms: [{ key: "u_next", logoPath: "/u.png" }],
            hasJapaneseRelease: true,
          }),
          createSeriesResult({
            tmdbId: 32,
            title: "Show Two",
            originalTitle: "Show Two Original",
            overview: "series overview",
            posterPath: "/show-two.jpg",
            releaseDate: "2024-02-01",
            jpWatchPlatforms: [{ key: "disney_plus", logoPath: "/d.png" }],
          }),
        ]);

        assertEquals(state.deleteCalls, 1);
        assertEquals(state.inserts.length, 1);
        assertEquals(
          (state.inserts[0] as Array<{ rank: number }>).map((row) => row.rank),
          [0, 1],
        );
      },
    );
  });
});

Deno.test("fetchTmdbTrending は refresh 失敗時に stale cache を返す", async () => {
  await withSupabaseTmdbEnv(async () => {
    const staleResults = [createMovieResult({ tmdbId: 301, title: "Stale Movie" })];

    await withMockFetch(
      (url, init) => handleTrendingFailureFetch(url, init, staleResults[0]),
      async () => {
        assertEquals(await fetchTmdbTrending(), staleResults);
      },
    );
  });
});
