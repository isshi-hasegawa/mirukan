import { assertEquals } from "jsr:@std/assert";
import { jsonResponse, withEnv, withMockFetch, withSupabaseAdminEnv } from "../test-helpers.ts";
import { fetchTmdbSimilar } from "./similar.ts";
import { createMovieResult } from "./test-fixtures.ts";
import {
  futureIso,
  pastIso,
  respondWithEmptyMetadataCache,
  withSupabaseTmdbEnv,
} from "./test-helpers.ts";

type SimilarRefreshState = {
  deleteCalls: number;
  inserts: unknown[];
};

async function handleSimilarCacheRefreshRequest(
  url: URL,
  request: Request,
  state: SimilarRefreshState,
): Promise<Response | null> {
  if (url.pathname !== "/rest/v1/work_recommendation_cache") {
    return null;
  }

  if (request.method === "GET") {
    return jsonResponse([
      {
        source_tmdb_media_type: "movie",
        source_tmdb_id: 41,
        payload: createMovieResult({ tmdbId: 50, title: "Stale Similar" }),
        rank: 0,
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

function handleSimilarPageFetch(url: URL): Response | null {
  if (url.hostname !== "api.themoviedb.org" || url.pathname !== "/3/movie/41/similar") {
    return null;
  }

  return jsonResponse({
    results: [
      {
        id: 51,
        media_type: "movie",
        title: "Similar A",
        original_title: "Similar A Original",
        overview: "A",
        release_date: "2024-01-01",
      },
      {
        id: 51,
        media_type: "movie",
        title: "Similar A",
        original_title: "Similar A Original",
        overview: "A",
        release_date: "2024-01-01",
      },
      {
        id: 52,
        media_type: "movie",
        title: "Similar B",
        original_title: "Similar B Original",
        overview: "B",
        release_date: "2024-02-01",
      },
    ],
  });
}

function handleSimilarEnrichmentFetch(url: URL): Response | null {
  if (url.hostname !== "api.themoviedb.org") {
    return null;
  }

  if (url.pathname.endsWith("/watch/providers")) {
    return jsonResponse({ results: { JP: { flatrate: [] } } });
  }

  if (url.pathname.endsWith("/release_dates")) {
    return jsonResponse({ results: [] });
  }

  if (url.pathname.endsWith("/external_ids")) {
    return jsonResponse({ imdb_id: null });
  }

  return null;
}

async function handleSimilarRefreshFetch(
  url: URL,
  init: RequestInit | undefined,
  state: SimilarRefreshState,
): Promise<Response> {
  const request = new Request(url, init);
  const response =
    (await handleSimilarCacheRefreshRequest(url, request, state)) ??
    respondWithEmptyMetadataCache(url, request) ??
    handleSimilarPageFetch(url) ??
    handleSimilarEnrichmentFetch(url);

  if (response) {
    return response;
  }

  throw new Error(`Unhandled fetch: ${request.method} ${url.toString()}`);
}

function handleStaleSimilarCacheRead(
  url: URL,
  request: Request,
  staleResult: ReturnType<typeof createMovieResult>,
): Response | null {
  if (url.pathname !== "/rest/v1/work_recommendation_cache" || request.method !== "GET") {
    return null;
  }

  return jsonResponse([
    {
      source_tmdb_media_type: "movie",
      source_tmdb_id: 41,
      payload: staleResult,
      rank: 0,
      expires_at: pastIso(),
    },
  ]);
}

function handleSimilarFailureRequest(url: URL, request: Request): Response | null {
  if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/movie/41/similar") {
    return jsonResponse({ results: [] });
  }

  if (url.pathname === "/rest/v1/work_recommendation_cache" && request.method === "DELETE") {
    return jsonResponse({ message: "delete failed" }, { status: 500 });
  }

  return null;
}

async function handleSimilarFailureFetch(
  url: URL,
  init: RequestInit | undefined,
  staleResult: ReturnType<typeof createMovieResult>,
): Promise<Response> {
  const request = new Request(url, init);
  const response =
    handleStaleSimilarCacheRead(url, request, staleResult) ??
    handleSimilarFailureRequest(url, request);

  if (response) {
    return response;
  }

  throw new Error(`Unhandled fetch: ${request.method} ${url.toString()}`);
}

Deno.test("fetchTmdbSimilar は source と recommendation の重複を除外する", async () => {
  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      OMDB_API_KEY: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        async (url) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/movie/41/similar") {
            return jsonResponse({
              results: [
                {
                  id: 51,
                  media_type: "movie",
                  title: "Similar A",
                  original_title: "Similar A Original",
                  overview: "A",
                  release_date: "2024-01-01",
                },
                {
                  id: 52,
                  media_type: "movie",
                  title: "Similar B",
                  original_title: "Similar B Original",
                  overview: "B",
                  release_date: "2024-02-01",
                },
                {
                  id: 51,
                  media_type: "movie",
                  title: "Similar A",
                  original_title: "Similar A Original",
                  overview: "A",
                  release_date: "2024-01-01",
                },
              ],
            });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/movie/42/similar") {
            return jsonResponse({
              results: [
                {
                  id: 52,
                  media_type: "movie",
                  title: "Similar B",
                  original_title: "Similar B Original",
                  overview: "B",
                  release_date: "2024-02-01",
                },
                {
                  id: 53,
                  media_type: "movie",
                  title: "Similar C",
                  original_title: "Similar C Original",
                  overview: "C",
                  release_date: "2024-03-01",
                },
              ],
            });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname.endsWith("/watch/providers")) {
            return jsonResponse({ results: { JP: { flatrate: [] } } });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname.endsWith("/release_dates")) {
            return jsonResponse({ results: [] });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname.endsWith("/external_ids")) {
            return jsonResponse({ imdb_id: null });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
        async () => {
          const results = await fetchTmdbSimilar([
            { tmdbId: 41, tmdbMediaType: "movie" },
            { tmdbId: 41, tmdbMediaType: "movie" },
            { tmdbId: 42, tmdbMediaType: "movie" },
          ]);

          assertEquals(results, [
            createMovieResult({
              tmdbId: 51,
              title: "Similar A",
              originalTitle: "Similar A Original",
              overview: "A",
              releaseDate: "2024-01-01",
              hasJapaneseRelease: false,
            }),
            createMovieResult({
              tmdbId: 52,
              title: "Similar B",
              originalTitle: "Similar B Original",
              overview: "B",
              releaseDate: "2024-02-01",
              hasJapaneseRelease: false,
            }),
            createMovieResult({
              tmdbId: 53,
              title: "Similar C",
              originalTitle: "Similar C Original",
              overview: "C",
              releaseDate: "2024-03-01",
              hasJapaneseRelease: false,
            }),
          ]);
        },
      );
    },
  );
});

Deno.test("fetchTmdbSimilar は fresh cache があれば source ごとにそれを返す", async () => {
  await withSupabaseAdminEnv(async () => {
    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);
        assertEquals(request.method, "GET");
        assertEquals(url.pathname, "/rest/v1/work_recommendation_cache");
        assertEquals(url.searchParams.get("recommendation_source"), "eq.similar");
        assertEquals(url.searchParams.get("source_tmdb_id"), "in.(41,42)");
        assertEquals(url.searchParams.get("order"), "rank.asc");

        return jsonResponse([
          {
            source_tmdb_media_type: "movie",
            source_tmdb_id: 41,
            payload: createMovieResult({ tmdbId: 51, title: "Cached A" }),
            rank: 0,
            expires_at: futureIso(),
          },
          {
            source_tmdb_media_type: "movie",
            source_tmdb_id: 41,
            payload: null,
            rank: 1,
            expires_at: futureIso(),
          },
          {
            source_tmdb_media_type: "movie",
            source_tmdb_id: 42,
            payload: createMovieResult({ tmdbId: 52, title: "Cached B" }),
            rank: 0,
            expires_at: futureIso(),
          },
          {
            source_tmdb_media_type: "tv",
            source_tmdb_id: 99,
            payload: createMovieResult({ tmdbId: 999, title: "Ignored" }),
            rank: 0,
            expires_at: futureIso(),
          },
        ]);
      },
      async () => {
        assertEquals(
          await fetchTmdbSimilar([
            { tmdbId: 41, tmdbMediaType: "movie" },
            { tmdbId: 42, tmdbMediaType: "movie" },
          ]),
          [
            createMovieResult({ tmdbId: 51, title: "Cached A" }),
            createMovieResult({ tmdbId: 52, title: "Cached B" }),
          ],
        );
      },
    );
  });
});

Deno.test("fetchTmdbSimilar は stale cache を refresh して recommendation cache を更新する", async () => {
  await withSupabaseTmdbEnv(async () => {
    const state: SimilarRefreshState = {
      deleteCalls: 0,
      inserts: [],
    };

    await withMockFetch(
      (url, init) => handleSimilarRefreshFetch(url, init, state),
      async () => {
        assertEquals(await fetchTmdbSimilar([{ tmdbId: 41, tmdbMediaType: "movie" }]), [
          createMovieResult({
            tmdbId: 51,
            title: "Similar A",
            originalTitle: "Similar A Original",
            overview: "A",
            releaseDate: "2024-01-01",
            hasJapaneseRelease: false,
          }),
          createMovieResult({
            tmdbId: 52,
            title: "Similar B",
            originalTitle: "Similar B Original",
            overview: "B",
            releaseDate: "2024-02-01",
            hasJapaneseRelease: false,
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

Deno.test("fetchTmdbSimilar は refresh 失敗時に stale cache を返す", async () => {
  await withSupabaseTmdbEnv(async () => {
    const staleResult = createMovieResult({ tmdbId: 60, title: "Stale Similar" });

    await withMockFetch(
      (url, init) => handleSimilarFailureFetch(url, init, staleResult),
      async () => {
        assertEquals(await fetchTmdbSimilar([{ tmdbId: 41, tmdbMediaType: "movie" }]), [
          staleResult,
        ]);
      },
    );
  });
});
