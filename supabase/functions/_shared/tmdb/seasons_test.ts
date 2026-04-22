import { assertEquals } from "jsr:@std/assert";
import { jsonResponse, withEnv, withMockFetch } from "../test-helpers.ts";
import { fetchTmdbSeasonOptions } from "./seasons.ts";
import type { TmdbSearchResult } from "./types.ts";

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
