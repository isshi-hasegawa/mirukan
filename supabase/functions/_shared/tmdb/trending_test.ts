import { assertEquals } from "jsr:@std/assert";
import { jsonResponse, withEnv, withMockFetch } from "../test-helpers.ts";
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
