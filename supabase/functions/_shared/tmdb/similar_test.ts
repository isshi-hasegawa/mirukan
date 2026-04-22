import { assertEquals } from "jsr:@std/assert";
import { jsonResponse, withEnv, withMockFetch } from "../test-helpers.ts";
import { fetchTmdbSimilar } from "./similar.ts";
import type { TmdbSearchResult } from "./types.ts";

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
