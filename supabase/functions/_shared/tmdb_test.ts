import { assertEquals } from "jsr:@std/assert";
import {
  classifyImdbIdLookupResult,
  fetchTmdbSeasonOptions,
  fetchTmdbSimilar,
  fetchTmdbTrending,
  fetchTmdbWorkDetails,
  searchTmdbWorks,
  type TmdbSearchResult,
  type TmdbSeasonSelectionTarget,
} from "./tmdb.ts";

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

async function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

async function withMockFetch(
  handler: (url: URL, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<void>,
) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      input instanceof Request ? new URL(input.url) : input instanceof URL ? input : new URL(input);
    return await handler(url, init);
  }) as typeof fetch;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function createMovieResult(
  overrides: Partial<TmdbSearchResult> & { tmdbId: number; title: string },
): TmdbSearchResult {
  return {
    tmdbId: overrides.tmdbId,
    tmdbMediaType: "movie",
    workType: "movie",
    title: overrides.title,
    originalTitle: overrides.originalTitle ?? `${overrides.title} Original`,
    overview: overrides.overview ?? "overview",
    posterPath: overrides.posterPath ?? null,
    releaseDate: overrides.releaseDate ?? "2024-01-01",
    jpWatchPlatforms: overrides.jpWatchPlatforms ?? [],
    hasJapaneseRelease: overrides.hasJapaneseRelease ?? true,
    rottenTomatoesScore: overrides.rottenTomatoesScore ?? null,
  };
}

function createSeriesResult(
  overrides: Partial<TmdbSearchResult> & { tmdbId: number; title: string },
): TmdbSearchResult {
  return {
    tmdbId: overrides.tmdbId,
    tmdbMediaType: "tv",
    workType: "series",
    title: overrides.title,
    originalTitle: overrides.originalTitle ?? `${overrides.title} Original`,
    overview: overrides.overview ?? "overview",
    posterPath: overrides.posterPath ?? null,
    releaseDate: overrides.releaseDate ?? "2024-01-01",
    jpWatchPlatforms: overrides.jpWatchPlatforms ?? [],
    hasJapaneseRelease: overrides.hasJapaneseRelease ?? true,
    rottenTomatoesScore: overrides.rottenTomatoesScore ?? null,
  };
}

Deno.test("classifyImdbIdLookupResult は IMDb lookup 結果を三値分類する", () => {
  assertEquals(classifyImdbIdLookupResult("tt0123456"), {
    kind: "found",
    imdbId: "tt0123456",
  });
  assertEquals(classifyImdbIdLookupResult(null), {
    kind: "missing",
  });
  assertEquals(classifyImdbIdLookupResult(undefined), {
    kind: "unavailable",
  });
  assertEquals(classifyImdbIdLookupResult("   "), {
    kind: "unavailable",
  });
});

Deno.test("searchTmdbWorks は中黒を含む query の fallback 検索結果を enrich する", async () => {
  const searchQueries: string[] = [];

  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      OMDB_API_KEY: "omdb-test-key",
      GEMINI_API_KEY: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        async (url) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/search/multi") {
            searchQueries.push(url.searchParams.get("query") ?? "");

            if (url.searchParams.get("query") === "インディ ジョーンズ") {
              return jsonResponse({
                results: [
                  {
                    id: 10,
                    media_type: "movie",
                    title: "レイダース/失われたアーク《聖櫃》",
                    original_title: "Raiders of the Lost Ark",
                    overview: "冒険活劇",
                    poster_path: "/raiders.jpg",
                    release_date: "1981-06-12",
                  },
                ],
              });
            }

            return jsonResponse({ results: [] });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/10/watch/providers"
          ) {
            return jsonResponse({
              results: {
                JP: {
                  flatrate: [
                    {
                      provider_id: 8,
                      provider_name: "Netflix",
                      logo_path: "/netflix.png",
                    },
                    {
                      provider_id: 9,
                      provider_name: "Prime Video",
                      logo_path: "/prime.png",
                    },
                    {
                      provider_id: 337,
                      provider_name: "Disney+",
                      logo_path: "/disney.png",
                    },
                    {
                      provider_id: 413,
                      provider_name: "Hulu",
                      logo_path: "/hulu.png",
                    },
                    {
                      provider_id: 350,
                      provider_name: "Apple TV+",
                      logo_path: "/appletvplus.png",
                    },
                    {
                      provider_id: 2,
                      provider_name: "Apple TV",
                      logo_path: "/appletv.png",
                    },
                    {
                      provider_id: 97,
                      provider_name: "U-NEXT",
                      logo_path: "/unext.png",
                    },
                    {
                      provider_id: 8,
                      provider_name: "Netflix",
                      logo_path: "/duplicate.png",
                    },
                    {
                      provider_id: 999,
                      provider_name: "Unknown",
                      logo_path: "/ignored.png",
                    },
                  ],
                },
              },
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/10/release_dates"
          ) {
            return jsonResponse({
              results: [
                {
                  iso_3166_1: "JP",
                  release_dates: [
                    {
                      certification: "PG12",
                      release_date: "1981-12-05",
                    },
                  ],
                },
              ],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/10/external_ids"
          ) {
            return jsonResponse({ imdb_id: "tt0082971" });
          }

          if (url.hostname === "www.omdbapi.com" && url.searchParams.get("i") === "tt0082971") {
            return jsonResponse({
              Response: "True",
              Ratings: [{ Source: "Rotten Tomatoes", Value: "95%" }],
            });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
        async () => {
          const results = await searchTmdbWorks("インディ・ジョーンズ");

          assertEquals(searchQueries, ["インディ・ジョーンズ", "インディ ジョーンズ"]);
          assertEquals(results, [
            {
              tmdbId: 10,
              tmdbMediaType: "movie",
              workType: "movie",
              title: "レイダース/失われたアーク《聖櫃》",
              originalTitle: "Raiders of the Lost Ark",
              overview: "冒険活劇",
              posterPath: "/raiders.jpg",
              releaseDate: "1981-06-12",
              jpWatchPlatforms: [
                { key: "netflix", logoPath: "/netflix.png" },
                { key: "prime_video", logoPath: "/prime.png" },
                { key: "disney_plus", logoPath: "/disney.png" },
                { key: "hulu", logoPath: "/hulu.png" },
                { key: "apple_tv_plus", logoPath: "/appletvplus.png" },
                { key: "apple_tv", logoPath: "/appletv.png" },
                { key: "u_next", logoPath: "/unext.png" },
              ],
              hasJapaneseRelease: true,
              rottenTomatoesScore: 95,
            },
          ]);
        },
      );
    },
  );
});

Deno.test("searchTmdbWorks は翻訳 fallback と localized metadata を使う", async () => {
  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      GEMINI_API_KEY: "gemini-test-key",
      OMDB_API_KEY: undefined,
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        async (url, init) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/search/multi") {
            if (url.searchParams.get("query") === "Seven Samurai") {
              return jsonResponse({
                results: [
                  {
                    id: 20,
                    media_type: "movie",
                    title: "Seven Samurai",
                    original_title: "Seven Samurai",
                    overview: "",
                    poster_path: null,
                    release_date: "1954-04-26",
                  },
                ],
              });
            }

            return jsonResponse({ results: [] });
          }

          if (
            url.hostname === "generativelanguage.googleapis.com" &&
            url.pathname.endsWith(":generateContent")
          ) {
            assertEquals(init?.method, "POST");
            return jsonResponse({
              candidates: [
                {
                  content: {
                    parts: [{ text: '{"query":"Seven Samurai"}' }],
                  },
                },
              ],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/20/watch/providers"
          ) {
            return jsonResponse({ results: { JP: { flatrate: [] } } });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/20/release_dates"
          ) {
            return jsonResponse({
              results: [
                {
                  iso_3166_1: "US",
                  release_dates: [{ release_date: "1954-10-01" }],
                },
              ],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/20/external_ids"
          ) {
            return jsonResponse({ imdb_id: null });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/movie/20") {
            return jsonResponse({
              id: 20,
              title: "Seven Samurai",
              original_title: "七人の侍",
              overview: "黒澤明による時代劇。",
              poster_path: "/seven-samurai.jpg",
              release_date: "1954-04-26",
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/20/translations"
          ) {
            return jsonResponse({
              translations: [
                {
                  iso_639_1: "ja",
                  iso_3166_1: "JP",
                  data: { title: "七人の侍" },
                },
              ],
            });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
        async () => {
          const results = await searchTmdbWorks("七人の侍");

          assertEquals(results, [
            {
              tmdbId: 20,
              tmdbMediaType: "movie",
              workType: "movie",
              title: "七人の侍",
              originalTitle: "七人の侍",
              overview: "黒澤明による時代劇。",
              posterPath: null,
              releaseDate: "1954-04-26",
              jpWatchPlatforms: [],
              hasJapaneseRelease: false,
              rottenTomatoesScore: null,
            },
          ]);
        },
      );
    },
  );
});

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
        async (url) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/trending/all/week") {
            switch (url.searchParams.get("page")) {
              case "1":
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
              case "2":
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
              default:
                return jsonResponse({
                  results: [{ id: 99, media_type: "person", name: "ignored" }],
                });
            }
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/31/watch/providers"
          ) {
            return jsonResponse({
              results: {
                JP: {
                  flatrate: [
                    {
                      provider_id: 97,
                      provider_name: "U-NEXT",
                      logo_path: "/u.png",
                    },
                  ],
                },
              },
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/31/release_dates"
          ) {
            return jsonResponse({
              results: [
                {
                  iso_3166_1: "JP",
                  release_dates: [{ release_date: "2024-01-10" }],
                },
              ],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/31/external_ids"
          ) {
            return jsonResponse({ imdb_id: "tt0000031" });
          }

          if (url.hostname === "www.omdbapi.com" && url.searchParams.get("i") === "tt0000031") {
            return jsonResponse({
              Response: "True",
              Ratings: [{ Source: "Rotten Tomatoes", Value: "88%" }],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/tv/32/watch/providers"
          ) {
            return jsonResponse({
              results: {
                JP: {
                  flatrate: [
                    {
                      provider_id: 337,
                      provider_name: "Disney+",
                      logo_path: "/d.png",
                    },
                  ],
                },
              },
            });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/32/external_ids") {
            return jsonResponse({}, { status: 503 });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
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

Deno.test("fetchTmdbSeasonOptions はシーズン候補だけを返し、汎用ラベルを補正する", async () => {
  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        async (url) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/300") {
            return jsonResponse({
              seasons: [
                { season_number: 0, name: "Specials", episode_count: 2 },
                { season_number: 1, name: "Season 1", episode_count: 10 },
                {
                  season_number: 2,
                  name: "Season 2",
                  overview: "second season",
                  poster_path: "/s2.jpg",
                  air_date: "2024-04-01",
                  episode_count: 8,
                },
                {
                  season_number: 3,
                  name: "完結編",
                  overview: null,
                  poster_path: null,
                  air_date: null,
                  episode_count: null,
                },
              ],
            });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
        async () => {
          const results = await fetchTmdbSeasonOptions(
            createSeriesResult({ tmdbId: 300, title: "My Show" }),
          );

          assertEquals(results, [
            {
              seasonNumber: 2,
              title: "My Show シーズン2",
              overview: "second season",
              posterPath: "/s2.jpg",
              releaseDate: "2024-04-01",
              episodeCount: 8,
            },
            {
              seasonNumber: 3,
              title: "My Show 完結編",
              overview: null,
              posterPath: null,
              releaseDate: null,
              episodeCount: null,
            },
          ]);
        },
      );
    },
  );
});

Deno.test("fetchTmdbWorkDetails は映画詳細を翻訳タイトルつきで返す", async () => {
  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        async (url) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/movie/400") {
            return jsonResponse({
              id: 400,
              title: "Movie 400",
              original_title: "Movie 400 Original",
              overview: "movie detail",
              poster_path: "/movie-400.jpg",
              release_date: "2020-01-01",
              runtime: 142,
              genres: [{ id: 1, name: "Adventure" }],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/400/translations"
          ) {
            return jsonResponse({
              translations: [
                {
                  iso_639_1: "ja",
                  iso_3166_1: "JP",
                  data: { title: "映画400" },
                },
              ],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/movie/400/external_ids"
          ) {
            return jsonResponse({ imdb_id: "tt0400" });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
        async () => {
          const result = await fetchTmdbWorkDetails(
            createMovieResult({ tmdbId: 400, title: "temp" }),
          );

          assertEquals(result, {
            tmdbId: 400,
            tmdbMediaType: "movie",
            workType: "movie",
            title: "映画400",
            originalTitle: "Movie 400 Original",
            overview: "movie detail",
            posterPath: "/movie-400.jpg",
            releaseDate: "2020-01-01",
            genres: ["Adventure"],
            runtimeMinutes: 142,
            typicalEpisodeRuntimeMinutes: null,
            episodeCount: null,
            seasonCount: null,
            seasonNumber: null,
            imdbId: "tt0400",
          });
        },
      );
    },
  );
});

Deno.test("fetchTmdbWorkDetails はシーズン詳細の runtime と title fallback を返す", async () => {
  const target: TmdbSeasonSelectionTarget = {
    tmdbId: 500,
    tmdbMediaType: "tv",
    workType: "season",
    title: "temporary",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: null,
    seasonNumber: 2,
    episodeCount: null,
    seriesTitle: "Series 500",
  };

  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        async (url) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/500/season/2") {
            return jsonResponse({
              id: "season-500-2",
              season_number: 2,
              name: "Season 2",
              overview: "season detail",
              poster_path: "/season-2.jpg",
              air_date: "2024-02-01",
              episodes: [{ runtime: 55 }, { runtime: null }],
            });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/500") {
            return jsonResponse({
              genres: [{ id: 2, name: "Drama" }],
              episode_run_time: [50],
            });
          }

          if (
            url.hostname === "api.themoviedb.org" &&
            url.pathname === "/3/tv/500/season/2/translations"
          ) {
            return jsonResponse({
              translations: [
                {
                  iso_639_1: "ja",
                  iso_3166_1: "JP",
                  data: { name: "シーズン2" },
                },
              ],
            });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/500/external_ids") {
            return jsonResponse({ imdb_id: null });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
        async () => {
          const result = await fetchTmdbWorkDetails(target);

          assertEquals(result, {
            tmdbId: 500,
            tmdbMediaType: "tv",
            workType: "season",
            title: "Series 500 シーズン2",
            originalTitle: "Season 2",
            overview: "season detail",
            posterPath: "/season-2.jpg",
            releaseDate: "2024-02-01",
            genres: ["Drama"],
            runtimeMinutes: null,
            typicalEpisodeRuntimeMinutes: 55,
            episodeCount: 2,
            seasonCount: null,
            seasonNumber: 2,
            imdbId: null,
          });
        },
      );
    },
  );
});

Deno.test("fetchTmdbWorkDetails はシリーズ詳細で season 1 の runtime fallback を使う", async () => {
  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      await withMockFetch(
        async (url) => {
          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/600") {
            return jsonResponse({
              id: 600,
              name: "Series 600",
              original_name: "Series 600 Original",
              overview: "series detail",
              poster_path: "/series-600.jpg",
              first_air_date: "2023-03-01",
              episode_run_time: [],
              number_of_seasons: 3,
              genres: [{ id: 3, name: "Sci-Fi" }],
              seasons: [{ season_number: 1, episode_count: 12 }],
            });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/600/season/1") {
            return jsonResponse({
              episodes: [{ runtime: 45 }, { runtime: null }],
            });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/600/translations") {
            return jsonResponse({ translations: [] });
          }

          if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/tv/600/external_ids") {
            return jsonResponse({}, { status: 500 });
          }

          throw new Error(`Unhandled fetch: ${url.toString()}`);
        },
        async () => {
          const result = await fetchTmdbWorkDetails(
            createSeriesResult({ tmdbId: 600, title: "Series 600 Candidate" }),
          );

          assertEquals(result, {
            tmdbId: 600,
            tmdbMediaType: "tv",
            workType: "series",
            title: "Series 600",
            originalTitle: "Series 600 Original",
            overview: "series detail",
            posterPath: "/series-600.jpg",
            releaseDate: "2023-03-01",
            genres: ["Sci-Fi"],
            runtimeMinutes: null,
            typicalEpisodeRuntimeMinutes: 45,
            episodeCount: 12,
            seasonCount: 3,
            seasonNumber: null,
            imdbId: undefined,
          });
        },
      );
    },
  );
});
