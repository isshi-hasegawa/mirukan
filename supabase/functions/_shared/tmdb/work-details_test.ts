import { assertEquals } from "jsr:@std/assert";
import { jsonResponse, withEnv, withMockFetch } from "../test-helpers.ts";
import { createMovieResult, createSeriesResult } from "./test-fixtures.ts";
import { fetchTmdbWorkDetails } from "./work-details.ts";
import type { TmdbSeasonSelectionTarget } from "./types.ts";

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
