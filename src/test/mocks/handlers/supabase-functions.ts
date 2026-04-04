import { http, HttpResponse } from "msw";
import type { TmdbFunctionResponse, TmdbSearchResult } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

/**
 * MSW handlers for Supabase Functions (Edge Functions)
 * These intercept calls to Supabase Functions and return mock responses
 */

export const supabaseFunctionsHandlers = [
  /**
   * fetch-tmdb-similar
   * Returns similar works based on source items
   */
  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-similar`, async ({ request }) => {
    const body = (await request.json()) as {
      sourceItems: Array<{ tmdbId: number; tmdbMediaType: string }>;
    };

    // Mock response - varies based on source items
    const sourceItems = body.sourceItems || [];
    const firstSource = sourceItems[0];

    if (firstSource?.tmdbId === 1) {
      return HttpResponse.json<TmdbFunctionResponse<TmdbSearchResult[]>>({
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
      });
    }

    if (firstSource?.tmdbId === 2) {
      return HttpResponse.json<TmdbFunctionResponse<TmdbSearchResult[]>>({
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
      });
    }

    // Default empty response
    return HttpResponse.json<TmdbFunctionResponse<TmdbSearchResult[]>>({
      data: [],
      error: null,
    });
  }),

  /**
   * fetch-tmdb-trending
   * Returns trending TMDb works
   */
  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-trending`, () => {
    return HttpResponse.json<TmdbFunctionResponse<TmdbSearchResult[]>>({
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
  }),

  /**
   * search-tmdb-works
   * Searches for TMDb works by query
   */
  http.post(`${SUPABASE_URL}/functions/v1/search-tmdb-works`, async ({ request }) => {
    const body = (await request.json()) as { query: string };
    const query = body.query || "";

    // Mock response based on query
    if (query.toLowerCase().includes("marvel")) {
      return HttpResponse.json<TmdbFunctionResponse<TmdbSearchResult[]>>({
        data: [
          {
            tmdbId: 100,
            tmdbMediaType: "movie",
            workType: "movie",
            title: "Marvel Movie",
            originalTitle: "Marvel Movie",
            overview: "A Marvel superhero movie",
            posterPath: "/marvel.jpg",
            releaseDate: "2024-01-01",
            jpWatchPlatforms: [],
            hasJapaneseRelease: true,
          },
        ],
        error: null,
      });
    }

    return HttpResponse.json<TmdbFunctionResponse<TmdbSearchResult[]>>({
      data: [],
      error: null,
    });
  }),

  /**
   * fetch-tmdb-season-options
   * Returns available seasons for a TV series
   */
  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-season-options`, async ({ request }) => {
    await request.json();

    return HttpResponse.json({
      data: [
        {
          seasonNumber: 1,
          title: "Season 1",
          overview: "First season",
          posterPath: null,
          releaseDate: "2024-01-01",
          episodeCount: 10,
        },
        {
          seasonNumber: 2,
          title: "Season 2",
          overview: "Second season",
          posterPath: null,
          releaseDate: "2024-06-01",
          episodeCount: 10,
        },
      ],
      error: null,
    });
  }),

  /**
   * fetch-tmdb-work-details
   * Returns detailed information about a work
   */
  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-work-details`, async ({ request }) => {
    const body = (await request.json()) as { tmdbId: number; mediaType: string };

    return HttpResponse.json({
      data: {
        tmdbId: body.tmdbId,
        tmdbMediaType: body.mediaType,
        workType: body.mediaType === "tv" ? "series" : "movie",
        title: "Mock Work",
        originalTitle: "Mock Work",
        overview: "Mock work overview",
        posterPath: null,
        releaseDate: "2024-01-01",
        genres: ["Drama", "Action"],
        runtimeMinutes: 120,
        typicalEpisodeRuntimeMinutes: 45,
        episodeCount: null,
        seasonCount: null,
        seasonNumber: null,
      },
      error: null,
    });
  }),
];
