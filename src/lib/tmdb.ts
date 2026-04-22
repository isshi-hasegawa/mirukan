import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "./supabase.ts";
import {
  fetchCachedSimilarResults,
  fetchCachedTrendingResults,
  mergeRecommendationResults,
  normalizeRecommendationSources,
} from "./tmdb-recommendation-cache.ts";
import {
  resolveSeasonTitle,
  type TmdbSearchResult,
  type TmdbSeasonOption,
  type TmdbSeasonSelectionTarget,
  type TmdbSelectionTarget,
  type TmdbWatchPlatform,
  type TmdbWorkDetails,
} from "./tmdb-shared.ts";
export { resolveSeasonTitle };
export type {
  TmdbSearchResult,
  TmdbSeasonOption,
  TmdbSeasonSelectionTarget,
  TmdbSelectionTarget,
  TmdbWorkDetails,
} from "./tmdb-shared.ts";
type SuggestDisplayTitleRequest = {
  title: string;
  originalTitle: string | null;
  workType: "movie" | "series";
};

type ResponseValidator<TResponse> = (data: unknown) => data is TResponse;

async function readSupabaseFunctionErrorDetail(response: Response): Promise<string | null> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await response.clone().json()) as unknown;

      if (isRecord(json)) {
        if (typeof json.error === "string" && json.error.trim()) {
          return json.error.trim();
        }

        if (typeof json.message === "string" && json.message.trim()) {
          return json.message.trim();
        }
      }
    }

    const text = (await response.clone().text()).trim();
    return text || null;
  } catch {
    return null;
  }
}

async function formatSupabaseFunctionError(functionName: string, error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    const detail = await readSupabaseFunctionErrorDetail(error.context);
    if (detail) {
      return `Supabase function ${functionName} failed: ${detail}`;
    }
  }

  if (error instanceof FunctionsHttpError) {
    return `Supabase function ${functionName} failed: ${error.message}`;
  }

  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return `Supabase function ${functionName} failed: ${error.message}`;
  }

  if (error instanceof Error) {
    return `Supabase function ${functionName} failed: ${error.message}`;
  }

  return `Supabase function ${functionName} failed`;
}

async function invokeTmdbFunction<TResponse>(
  functionName: string,
  body?: Record<string, unknown>,
  validate?: ResponseValidator<TResponse>,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });

  if (error) {
    throw new Error(await formatSupabaseFunctionError(functionName, error));
  }

  if (validate && !validate(data)) {
    throw new Error(`Supabase function ${functionName} returned invalid data`);
  }

  return data as TResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isNullableNumber(value: unknown): value is number | null {
  return typeof value === "number" || value === null;
}

function isTmdbMediaType(value: unknown): value is "movie" | "tv" {
  return value === "movie" || value === "tv";
}

function isTmdbSearchWorkType(value: unknown): value is "movie" | "series" {
  return value === "movie" || value === "series";
}

function isTmdbWorkType(value: unknown): value is "movie" | "series" | "season" {
  return value === "movie" || value === "series" || value === "season";
}

function isTmdbWatchPlatform(value: unknown): value is TmdbWatchPlatform {
  return isRecord(value) && typeof value.key === "string" && isNullableString(value.logoPath);
}

type TmdbMediaBasics = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
};

function hasTmdbMediaBasics(value: unknown): value is Record<string, unknown> & TmdbMediaBasics {
  return (
    isRecord(value) &&
    typeof value.tmdbId === "number" &&
    isTmdbMediaType(value.tmdbMediaType) &&
    typeof value.title === "string" &&
    isNullableString(value.originalTitle) &&
    isNullableString(value.overview) &&
    isNullableString(value.posterPath) &&
    isNullableString(value.releaseDate)
  );
}

function isTmdbSearchResult(value: unknown): value is TmdbSearchResult {
  return (
    hasTmdbMediaBasics(value) &&
    isTmdbSearchWorkType(value.workType) &&
    Array.isArray(value.jpWatchPlatforms) &&
    value.jpWatchPlatforms.every(isTmdbWatchPlatform) &&
    typeof value.hasJapaneseRelease === "boolean" &&
    (value.rottenTomatoesScore === undefined || isNullableNumber(value.rottenTomatoesScore))
  );
}

function isTmdbSearchResultArray(value: unknown): value is TmdbSearchResult[] {
  return Array.isArray(value) && value.every(isTmdbSearchResult);
}

function isTmdbSeasonOption(value: unknown): value is TmdbSeasonOption {
  return (
    isRecord(value) &&
    typeof value.seasonNumber === "number" &&
    typeof value.title === "string" &&
    isNullableString(value.overview) &&
    isNullableString(value.posterPath) &&
    isNullableString(value.releaseDate) &&
    isNullableNumber(value.episodeCount)
  );
}

function isTmdbSeasonOptionArray(value: unknown): value is TmdbSeasonOption[] {
  return Array.isArray(value) && value.every(isTmdbSeasonOption);
}

function isTmdbWorkDetails(value: unknown): value is TmdbWorkDetails {
  return (
    hasTmdbMediaBasics(value) &&
    isTmdbWorkType(value.workType) &&
    Array.isArray(value.genres) &&
    value.genres.every((genre) => typeof genre === "string") &&
    isNullableNumber(value.runtimeMinutes) &&
    isNullableNumber(value.typicalEpisodeRuntimeMinutes) &&
    isNullableNumber(value.episodeCount) &&
    isNullableNumber(value.seasonCount) &&
    isNullableNumber(value.seasonNumber) &&
    (value.imdbId === undefined || isNullableString(value.imdbId))
  );
}

function isSuggestDisplayTitleResponse(value: unknown): value is { title: string | null } {
  return isRecord(value) && isNullableString(value.title);
}

export async function fetchTmdbSimilar(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): Promise<TmdbSearchResult[]> {
  const normalizedSourceItems = normalizeRecommendationSources(sourceItems);

  if (normalizedSourceItems.length === 0) {
    return [];
  }

  return fetchCachedSimilarResults(normalizedSourceItems, async () => {
    return invokeTmdbFunction<TmdbSearchResult[]>(
      "fetch-tmdb-similar",
      {
        sourceItems: normalizedSourceItems,
      },
      isTmdbSearchResultArray,
    );
  });
}

export async function fetchTmdbRecommendations(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): Promise<TmdbSearchResult[]> {
  const [similar, trending] = await Promise.all([
    fetchTmdbSimilar(sourceItems),
    fetchTmdbTrending(),
  ]);

  return mergeRecommendationResults(similar, trending);
}

export async function fetchTmdbTrending(): Promise<TmdbSearchResult[]> {
  return fetchCachedTrendingResults(async () => {
    const results = await invokeTmdbFunction<TmdbSearchResult[]>(
      "fetch-tmdb-trending",
      undefined,
      isTmdbSearchResultArray,
    );
    return results;
  });
}

export { resetTmdbRecommendationCachesForTest } from "./tmdb-recommendation-cache.ts";

export function searchTmdbWorks(query: string) {
  return invokeTmdbFunction<TmdbSearchResult[]>(
    "search-tmdb-works",
    { query },
    isTmdbSearchResultArray,
  );
}

export async function suggestDisplayTitle(
  request: SuggestDisplayTitleRequest,
): Promise<string | null> {
  const data = await invokeTmdbFunction<{ title: string | null }>(
    "suggest-display-title",
    request,
    isSuggestDisplayTitleResponse,
  );

  return data.title;
}

export function fetchTmdbSeasonOptions(result: TmdbSearchResult): Promise<TmdbSeasonOption[]> {
  return invokeTmdbFunction<TmdbSeasonOption[]>(
    "fetch-tmdb-season-options",
    { result },
    isTmdbSeasonOptionArray,
  );
}

export function fetchTmdbWorkDetails(target: TmdbSelectionTarget): Promise<TmdbWorkDetails> {
  return invokeTmdbFunction<TmdbWorkDetails>(
    "fetch-tmdb-work-details",
    { target },
    isTmdbWorkDetails,
  );
}
