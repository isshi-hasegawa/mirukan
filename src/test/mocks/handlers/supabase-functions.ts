import { http, HttpResponse } from "msw";
import type {
  TmdbSeasonOption,
  TmdbSearchResult,
  TmdbSelectionTarget,
  TmdbWorkDetails,
} from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

const similarResultsBySourceKey = new Map<string, TmdbSearchResult[]>();
const seasonOptionsByResultKey = new Map<string, TmdbSeasonOption[]>();
const workDetailsByTargetKey = new Map<string, TmdbWorkDetails>();
const searchResultsByQuery = new Map<string, TmdbSearchResult[]>();
const displayTitleSuggestionsByTitle = new Map<string, string | null>();
let trendingResults: TmdbSearchResult[] = [];

function buildSourceKey(sourceItems: Array<{ tmdbId: number; tmdbMediaType: string }>) {
  return sourceItems.map((item) => `${item.tmdbMediaType}-${item.tmdbId}`).join("|");
}

function buildResultKey(result: { tmdbId: number; tmdbMediaType: string }) {
  return `${result.tmdbMediaType}-${result.tmdbId}`;
}

function buildTargetKey(target: TmdbSelectionTarget) {
  if (target.workType === "season") {
    return `${target.tmdbMediaType}-${target.tmdbId}-season-${target.seasonNumber}`;
  }

  return `${target.tmdbMediaType}-${target.tmdbId}-${target.workType}`;
}

export function resetMockTmdbData() {
  similarResultsBySourceKey.clear();
  seasonOptionsByResultKey.clear();
  workDetailsByTargetKey.clear();
  searchResultsByQuery.clear();
  displayTitleSuggestionsByTitle.clear();
  trendingResults = [];
}

export function setMockTmdbSimilarResults(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
  results: TmdbSearchResult[],
) {
  similarResultsBySourceKey.set(buildSourceKey(sourceItems), results);
}

export function setMockTmdbTrendingResults(results: TmdbSearchResult[]) {
  trendingResults = results;
}

export function setMockTmdbSearchResults(query: string, results: TmdbSearchResult[]) {
  searchResultsByQuery.set(query, results);
}

export function setMockDisplayTitleSuggestion(title: string, suggestedTitle: string | null) {
  displayTitleSuggestionsByTitle.set(title, suggestedTitle);
}

export function setMockTmdbSeasonOptions(
  result: { tmdbId: number; tmdbMediaType: "movie" | "tv" },
  options: TmdbSeasonOption[],
) {
  seasonOptionsByResultKey.set(buildResultKey(result), options);
}

export function setMockTmdbWorkDetails(target: TmdbSelectionTarget, details: TmdbWorkDetails) {
  workDetailsByTargetKey.set(buildTargetKey(target), details);
}

export const supabaseFunctionsHandlers = [
  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-similar`, async ({ request }) => {
    const body = (await request.json()) as {
      sourceItems?: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>;
    };

    return HttpResponse.json(
      similarResultsBySourceKey.get(buildSourceKey(body.sourceItems ?? [])) ?? [],
    );
  }),

  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-trending`, () => {
    return HttpResponse.json(trendingResults);
  }),

  http.post(`${SUPABASE_URL}/functions/v1/search-tmdb-works`, async ({ request }) => {
    const body = (await request.json()) as { query?: string };

    return HttpResponse.json(body.query ? (searchResultsByQuery.get(body.query) ?? []) : []);
  }),

  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-season-options`, async ({ request }) => {
    const body = (await request.json()) as {
      result?: { tmdbId: number; tmdbMediaType: "movie" | "tv" };
    };

    return HttpResponse.json(
      body.result ? (seasonOptionsByResultKey.get(buildResultKey(body.result)) ?? []) : [],
    );
  }),

  http.post(`${SUPABASE_URL}/functions/v1/fetch-tmdb-work-details`, async ({ request }) => {
    const body = (await request.json()) as { target?: TmdbSelectionTarget };

    return HttpResponse.json(
      body.target ? (workDetailsByTargetKey.get(buildTargetKey(body.target)) ?? null) : null,
    );
  }),

  http.post(`${SUPABASE_URL}/functions/v1/suggest-display-title`, async ({ request }) => {
    const body = (await request.json()) as { title?: string };

    return HttpResponse.json({
      title: body.title ? (displayTitleSuggestionsByTitle.get(body.title) ?? null) : null,
    });
  }),
];
