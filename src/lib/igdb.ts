import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "./supabase.ts";

export type IgdbGamePlatform = "steam" | "playstation" | "switch" | "xbox" | "ios" | "android";

export type IgdbSearchResult = {
  igdbId: number;
  title: string;
  coverImageId: string | null;
  releaseDate: string | null;
  platforms: IgdbGamePlatform[];
  summary: string | null;
};

export type IgdbWorkDetails = {
  igdbId: number;
  title: string;
  summary: string | null;
  coverImageId: string | null;
  releaseDate: string | null;
  releaseDates: Partial<Record<IgdbGamePlatform, string>>;
  platforms: IgdbGamePlatform[];
  developer: string | null;
  publisher: string | null;
  franchise: string | null;
};

type ResponseValidator<TResponse> = (data: unknown) => data is TResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isGamePlatform(value: unknown): value is IgdbGamePlatform {
  return (
    value === "steam" ||
    value === "playstation" ||
    value === "switch" ||
    value === "xbox" ||
    value === "ios" ||
    value === "android"
  );
}

function isGamePlatformArray(value: unknown): value is IgdbGamePlatform[] {
  return Array.isArray(value) && value.every(isGamePlatform);
}

function isReleaseDates(value: unknown): value is Partial<Record<IgdbGamePlatform, string>> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([key, date]) => isGamePlatform(key) && typeof date === "string",
  );
}

function isIgdbSearchResult(value: unknown): value is IgdbSearchResult {
  return (
    isRecord(value) &&
    typeof value.igdbId === "number" &&
    typeof value.title === "string" &&
    isNullableString(value.coverImageId) &&
    isNullableString(value.releaseDate) &&
    isGamePlatformArray(value.platforms) &&
    isNullableString(value.summary)
  );
}

function isIgdbSearchResultArray(value: unknown): value is IgdbSearchResult[] {
  return Array.isArray(value) && value.every(isIgdbSearchResult);
}

function isIgdbWorkDetails(value: unknown): value is IgdbWorkDetails {
  return (
    isRecord(value) &&
    typeof value.igdbId === "number" &&
    typeof value.title === "string" &&
    isNullableString(value.summary) &&
    isNullableString(value.coverImageId) &&
    isNullableString(value.releaseDate) &&
    isReleaseDates(value.releaseDates) &&
    isGamePlatformArray(value.platforms) &&
    isNullableString(value.developer) &&
    isNullableString(value.publisher) &&
    isNullableString(value.franchise)
  );
}

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

async function invokeIgdbFunction<TResponse>(
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

export function searchIgdbWorks(query: string) {
  return invokeIgdbFunction<IgdbSearchResult[]>(
    "search-igdb-works",
    { query },
    isIgdbSearchResultArray,
  );
}

export function fetchIgdbWorkDetails(igdbId: number) {
  return invokeIgdbFunction<IgdbWorkDetails>(
    "fetch-igdb-work-details",
    { igdbId },
    isIgdbWorkDetails,
  );
}

export function buildIgdbImageUrl(
  imageId: string | null,
  size: "cover_small" | "cover_big" = "cover_small",
) {
  if (!imageId) {
    return null;
  }

  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.png`;
}
