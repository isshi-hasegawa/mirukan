import { assertEquals } from "jsr:@std/assert";
import { jsonResponse, withEnv, withMockFetch } from "../test-helpers.ts";
import { searchTmdbWorks } from "./search.ts";

function isTmdbRequest(url: URL, pathname: string): boolean {
  return url.hostname === "api.themoviedb.org" && url.pathname === pathname;
}

function isGeminiGenerateContentRequest(url: URL): boolean {
  return (
    url.hostname === "generativelanguage.googleapis.com" &&
    url.pathname.endsWith(":generateContent")
  );
}

function handleLocalizedSearchFallbackFetch(url: URL, init?: RequestInit): Response {
  if (isTmdbRequest(url, "/3/search/multi")) {
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

  if (isGeminiGenerateContentRequest(url)) {
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

  if (isTmdbRequest(url, "/3/movie/20/watch/providers")) {
    return jsonResponse({ results: { JP: { flatrate: [] } } });
  }

  if (isTmdbRequest(url, "/3/movie/20/release_dates")) {
    return jsonResponse({
      results: [
        {
          iso_3166_1: "US",
          release_dates: [{ release_date: "1954-10-01" }],
        },
      ],
    });
  }

  if (isTmdbRequest(url, "/3/movie/20/external_ids")) {
    return jsonResponse({ imdb_id: null });
  }

  if (isTmdbRequest(url, "/3/movie/20")) {
    return jsonResponse({
      id: 20,
      title: "Seven Samurai",
      original_title: "七人の侍",
      overview: "黒澤明による時代劇。",
      poster_path: "/seven-samurai.jpg",
      release_date: "1954-04-26",
    });
  }

  if (isTmdbRequest(url, "/3/movie/20/translations")) {
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
}

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
                    { provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.png" },
                    { provider_id: 9, provider_name: "Prime Video", logo_path: "/prime.png" },
                    { provider_id: 337, provider_name: "Disney+", logo_path: "/disney.png" },
                    { provider_id: 413, provider_name: "Hulu", logo_path: "/hulu.png" },
                    { provider_id: 350, provider_name: "Apple TV+", logo_path: "/appletvplus.png" },
                    { provider_id: 2, provider_name: "Apple TV", logo_path: "/appletv.png" },
                    { provider_id: 97, provider_name: "U-NEXT", logo_path: "/unext.png" },
                    { provider_id: 8, provider_name: "Netflix", logo_path: "/duplicate.png" },
                    { provider_id: 999, provider_name: "Unknown", logo_path: "/ignored.png" },
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
                  release_dates: [{ certification: "PG12", release_date: "1981-12-05" }],
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
        (url, init) => handleLocalizedSearchFallbackFetch(url, init),
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
