import "../edge-runtime.d.ts";
import {
  TMDB_MAX_RETRY_ATTEMPTS,
  TMDB_RETRY_BASE_DELAY_MS,
  TMDB_RETRYABLE_STATUSES,
} from "./types.ts";

function getTmdbApiKey() {
  const apiKey = Deno.env.get("TMDB_API_KEY");

  if (!apiKey) {
    throw new Error("Missing environment variable: TMDB_API_KEY");
  }

  return apiKey;
}

export async function fetchTmdbJson<T>(
  path: string,
  searchParams: Record<string, string>,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", getTmdbApiKey());

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  let lastStatus: number | null = null;

  for (let attempt = 0; attempt <= TMDB_MAX_RETRY_ATTEMPTS; attempt += 1) {
    const response = await fetch(url, init);

    if (response.ok) {
      return (await response.json()) as T;
    }

    lastStatus = response.status;
    if (!TMDB_RETRYABLE_STATUSES.has(response.status) || attempt === TMDB_MAX_RETRY_ATTEMPTS) {
      throw new Error(`TMDb request failed with status ${response.status}`);
    }

    const retryAfterHeader = response.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Number.parseFloat(retryAfterHeader) * 1000 : Number.NaN;
    const backoffMs =
      Number.isFinite(retryAfterMs) && retryAfterMs > 0
        ? retryAfterMs
        : TMDB_RETRY_BASE_DELAY_MS * 2 ** attempt;
    await delay(backoffMs);
  }

  throw new Error(`TMDb request failed with status ${lastStatus ?? "unknown"}`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  concurrency: number,
  mapper: (item: TInput, index: number) => Promise<TOutput>,
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const results = Array.from<TOutput | undefined>({ length: items.length });
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results as TOutput[];
}

export function firstNonBlank(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}
