import "./edge-runtime.d.ts";
import { getSupabaseAdminClient } from "./supabase-admin.ts";

type TmdbMediaType = "movie" | "tv";

type TmdbMultiSearchResponse = {
  results: Array<{
    id: number;
    media_type: string;
    title?: string;
    name?: string;
    original_title?: string;
    original_name?: string;
    overview?: string;
    poster_path?: string | null;
    release_date?: string;
    first_air_date?: string;
  }>;
};

type TmdbMovieDetailsResponse = {
  id: number;
  title: string;
  original_title?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  release_date?: string | null;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
};

type TmdbTvDetailsResponse = {
  id: number;
  name: string;
  original_name?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  first_air_date?: string | null;
  episode_run_time?: number[] | null;
  number_of_seasons?: number | null;
  genres?: Array<{ id: number; name: string }>;
  seasons?: Array<{
    season_number: number;
    name?: string | null;
    overview?: string | null;
    poster_path?: string | null;
    air_date?: string | null;
    episode_count?: number | null;
  }>;
};

type TmdbSeasonDetailsResponse = {
  id: string;
  season_number: number;
  name: string;
  overview?: string | null;
  poster_path?: string | null;
  air_date?: string | null;
  episodes?: Array<{
    runtime?: number | null;
  }>;
};

type TmdbWatchProvidersResponse = {
  results?: {
    JP?: {
      flatrate?: Array<{
        provider_id: number;
        provider_name: string;
        logo_path: string | null;
      }>;
    };
  };
};

type TmdbReleaseDatesResponse = {
  results?: Array<{
    iso_3166_1: string;
    release_dates?: Array<{
      certification?: string;
      release_date: string;
      type?: number;
    }>;
  }>;
};

type TmdbTranslationsResponse = {
  translations?: Array<{
    iso_639_1?: string;
    iso_3166_1?: string;
    data?: {
      title?: string;
      name?: string;
    };
  }>;
};

export type TmdbWatchPlatform = {
  key: string;
  logoPath: string | null;
};

export type TmdbSearchResult = {
  tmdbId: number;
  tmdbMediaType: TmdbMediaType;
  workType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  jpWatchPlatforms: TmdbWatchPlatform[];
  hasJapaneseRelease: boolean;
};

export type TmdbSeasonSelectionTarget = {
  tmdbId: number;
  tmdbMediaType: "tv";
  workType: "season";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  seasonNumber: number;
  episodeCount: number | null;
  seriesTitle: string;
};

type TmdbSeasonOption = {
  seasonNumber: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  episodeCount: number | null;
};

export type TmdbSelectionTarget = TmdbSearchResult | TmdbSeasonSelectionTarget;

type TmdbWorkDetails = {
  tmdbId: number;
  tmdbMediaType: TmdbMediaType;
  workType: "movie" | "series" | "season";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  typicalEpisodeRuntimeMinutes: number | null;
  episodeCount: number | null;
  seasonCount: number | null;
  seasonNumber: number | null;
};

const TMDB_PROVIDER_ID_MAP: Record<number, string> = {
  8: "netflix",
  9: "prime_video",
  337: "disney_plus",
  413: "hulu",
  350: "apple_tv_plus",
  2: "apple_tv",
  97: "u_next",
};

const TRENDING_CACHE_WINDOW = "week";
const TRENDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SIMILAR_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getTmdbApiKey() {
  const apiKey = Deno.env.get("TMDB_API_KEY");

  if (!apiKey) {
    throw new Error("Missing environment variable: TMDB_API_KEY");
  }

  return apiKey;
}

async function fetchTmdbJson<T>(
  path: string,
  searchParams: Record<string, string>,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", getTmdbApiKey());

  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`TMDb request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fetchWatchProvidersJP(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<TmdbWatchPlatform[]> {
  try {
    const json = await fetchTmdbJson<TmdbWatchProvidersResponse>(
      `/${mediaType}/${tmdbId}/watch/providers`,
      {},
    );
    const flatrate = json.results?.JP?.flatrate ?? [];

    const seen = new Set<string>();
    const platforms: TmdbWatchPlatform[] = [];
    for (const provider of flatrate) {
      const key = TMDB_PROVIDER_ID_MAP[provider.provider_id];
      if (key && !seen.has(key)) {
        seen.add(key);
        platforms.push({ key, logoPath: provider.logo_path ?? null });
      }
    }

    return platforms;
  } catch {
    return [];
  }
}

async function checkJapaneseRelease(tmdbId: number): Promise<boolean> {
  try {
    const json = await fetchTmdbJson<TmdbReleaseDatesResponse>(
      `/movie/${tmdbId}/release_dates`,
      {},
    );
    const jpRelease = json.results?.find((result) => result.iso_3166_1 === "JP");
    return jpRelease !== undefined && (jpRelease.release_dates?.length ?? 0) > 0;
  } catch {
    return true;
  }
}

async function enrichWithWatchProviders(results: TmdbSearchResult[]): Promise<TmdbSearchResult[]> {
  return Promise.all(
    results.map(async (result) => {
      const [jpWatchPlatforms, hasJapaneseRelease] = await Promise.all([
        fetchWatchProvidersJP(result.tmdbId, result.tmdbMediaType),
        result.workType === "movie" ? checkJapaneseRelease(result.tmdbId) : Promise.resolve(true),
      ]);

      return { ...result, jpWatchPlatforms, hasJapaneseRelease };
    }),
  );
}

function mapMultiSearchResult(
  result: TmdbMultiSearchResponse["results"][number],
  mediaType: TmdbMediaType,
): TmdbSearchResult | null {
  const title = mediaType === "movie" ? result.title : result.name;

  if (!title) {
    return null;
  }

  return {
    tmdbId: result.id,
    tmdbMediaType: mediaType,
    workType: mediaType === "movie" ? "movie" : "series",
    title,
    originalTitle:
      mediaType === "movie" ? (result.original_title ?? null) : (result.original_name ?? null),
    overview: result.overview ?? null,
    posterPath: result.poster_path ?? null,
    releaseDate:
      mediaType === "movie" ? (result.release_date ?? null) : (result.first_air_date ?? null),
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
  };
}

export async function searchTmdbWorks(query: string) {
  const json = await fetchTmdbJson<TmdbMultiSearchResponse>("/search/multi", {
    query,
    language: "ja-JP",
    include_adult: "false",
  });

  const base = json.results.flatMap((result): TmdbSearchResult[] => {
    if (result.media_type !== "movie" && result.media_type !== "tv") {
      return [];
    }

    const mapped = mapMultiSearchResult(result, result.media_type);
    return mapped ? [mapped] : [];
  });

  return enrichWithWatchProviders(base);
}

async function fetchTrendingPage(page: number): Promise<TmdbSearchResult[]> {
  const json = await fetchTmdbJson<TmdbMultiSearchResponse>("/trending/all/week", {
    language: "ja-JP",
    page: page.toString(),
  });

  return json.results.flatMap((result): TmdbSearchResult[] => {
    if (result.media_type !== "movie" && result.media_type !== "tv") {
      return [];
    }

    const mapped = mapMultiSearchResult(result, result.media_type);
    return mapped ? [mapped] : [];
  });
}

async function fetchFreshTmdbTrending(): Promise<TmdbSearchResult[]> {
  const pages = await Promise.all([
    fetchTrendingPage(1),
    fetchTrendingPage(2),
    fetchTrendingPage(3),
  ]);
  const seen = new Set<string>();

  return enrichWithWatchProviders(
    pages.flat().filter((item) => {
      const key = `${item.tmdbMediaType}-${item.tmdbId}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }),
  );
}

function buildRecommendationSourceKey(item: { tmdbId: number; tmdbMediaType: TmdbMediaType }) {
  return `${item.tmdbMediaType}-${item.tmdbId}`;
}

function isCacheEntryFresh(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(expiresAt);
  return !Number.isNaN(expiresAtMs) && expiresAtMs > Date.now();
}

function buildExpiresAt(ttlMs: number) {
  return new Date(Date.now() + ttlMs).toISOString();
}

function normalizeCachedSearchResult(payload: unknown): TmdbSearchResult | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload as TmdbSearchResult;
}

async function readTrendingCache() {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("tmdb_trending_cache")
    .select("payload, rank, expires_at")
    .eq("window", TRENDING_CACHE_WINDOW)
    .order("rank", { ascending: true });

  if (error) {
    throw new Error(`Failed to read trending cache: ${error.message}`);
  }

  const results = (data ?? [])
    .flatMap((row) => {
      const result = normalizeCachedSearchResult(row.payload);
      return result ? [result] : [];
    })
    .filter((result) => !!result);

  return {
    fresh:
      (data ?? []).length > 0 && (data ?? []).every((row) => isCacheEntryFresh(row.expires_at)),
    results,
    admin,
  };
}

async function writeTrendingCache(
  admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  results: TmdbSearchResult[],
) {
  const fetchedAt = new Date().toISOString();
  const expiresAt = buildExpiresAt(TRENDING_CACHE_TTL_MS);

  const { error: deleteError } = await admin
    .from("tmdb_trending_cache")
    .delete()
    .eq("window", TRENDING_CACHE_WINDOW);

  if (deleteError) {
    throw new Error(`Failed to clear trending cache: ${deleteError.message}`);
  }

  if (results.length === 0) {
    return;
  }

  const { error: insertError } = await admin.from("tmdb_trending_cache").insert(
    results.map((result, index) => ({
      window: TRENDING_CACHE_WINDOW,
      rank: index,
      tmdb_media_type: result.tmdbMediaType,
      tmdb_id: result.tmdbId,
      payload: result,
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to write trending cache: ${insertError.message}`);
  }
}

export async function fetchTmdbTrending(): Promise<TmdbSearchResult[]> {
  const cached = await readTrendingCache().catch(() => null);
  if (cached?.fresh && cached.results.length > 0) {
    return cached.results;
  }

  try {
    const fresh = await fetchFreshTmdbTrending();
    if (cached?.admin) {
      await writeTrendingCache(cached.admin, fresh);
    }
    return fresh;
  } catch (error) {
    if (cached && cached.results.length > 0) {
      return cached.results;
    }

    throw error;
  }
}

async function fetchSimilarPage(
  tmdbId: number,
  mediaType: TmdbMediaType,
): Promise<TmdbSearchResult[]> {
  try {
    const json = await fetchTmdbJson<TmdbMultiSearchResponse>(`/${mediaType}/${tmdbId}/similar`, {
      language: "ja-JP",
      page: "1",
    });

    return json.results.flatMap((result): TmdbSearchResult[] => {
      const mapped = mapMultiSearchResult(result, mediaType);
      return mapped ? [mapped] : [];
    });
  } catch {
    return [];
  }
}

function normalizeRecommendationSources(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }>,
) {
  const seen = new Set<string>();
  const uniqueItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }> = [];

  for (const item of sourceItems) {
    const key = `${item.tmdbMediaType}-${item.tmdbId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    uniqueItems.push(item);
  }

  return uniqueItems.slice(0, 5);
}

export async function fetchTmdbSimilar(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }>,
) {
  const normalizedSourceItems = normalizeRecommendationSources(sourceItems);

  if (normalizedSourceItems.length === 0) {
    return [];
  }

  const cached = await readSimilarCache(normalizedSourceItems).catch(() => new Map());
  const resultGroups = await Promise.all(
    normalizedSourceItems.map(async (item) => {
      const key = buildRecommendationSourceKey(item);
      const cacheEntry = cached.get(key);

      if (cacheEntry?.fresh) {
        return cacheEntry.results;
      }

      try {
        const refreshed = await refreshSimilarCacheForSource(item);
        if (refreshed.length > 0 || !cacheEntry) {
          return refreshed;
        }
      } catch {
        // fall through to stale cache
      }

      return cacheEntry?.results ?? [];
    }),
  );

  return dedupeRecommendationResults(resultGroups.flat()).slice(0, 40);
}

function dedupeRecommendationResults(results: TmdbSearchResult[]) {
  const seen = new Set<string>();

  return results.filter((item) => {
    const key = buildRecommendationSourceKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function readSimilarCache(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: TmdbMediaType }>,
) {
  const grouped = new Map<
    string,
    {
      fresh: boolean;
      results: TmdbSearchResult[];
    }
  >();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return grouped;
  }

  const sourceIds = [...new Set(sourceItems.map((item) => item.tmdbId))];
  const validSourceKeys = new Set(sourceItems.map((item) => buildRecommendationSourceKey(item)));

  const { data, error } = await admin
    .from("work_recommendation_cache")
    .select("source_tmdb_media_type, source_tmdb_id, payload, rank, expires_at")
    .eq("recommendation_source", "similar")
    .in("source_tmdb_id", sourceIds)
    .order("rank", { ascending: true });

  if (error) {
    throw new Error(`Failed to read similar cache: ${error.message}`);
  }

  const rowsBySource = new Map<string, Array<{ payload: unknown; expires_at: string | null }>>();
  for (const row of data ?? []) {
    const sourceKey = `${row.source_tmdb_media_type}-${row.source_tmdb_id}`;
    if (!validSourceKeys.has(sourceKey)) {
      continue;
    }

    const current = rowsBySource.get(sourceKey) ?? [];
    current.push({ payload: row.payload, expires_at: row.expires_at });
    rowsBySource.set(sourceKey, current);
  }

  for (const item of sourceItems) {
    const key = buildRecommendationSourceKey(item);
    const rows = rowsBySource.get(key) ?? [];
    grouped.set(key, {
      fresh: rows.length > 0 && rows.every((row) => isCacheEntryFresh(row.expires_at)),
      results: rows.flatMap((row) => {
        const result = normalizeCachedSearchResult(row.payload);
        return result ? [result] : [];
      }),
    });
  }

  return grouped;
}

async function refreshSimilarCacheForSource(sourceItem: {
  tmdbId: number;
  tmdbMediaType: TmdbMediaType;
}) {
  const fresh = await enrichWithWatchProviders(
    dedupeRecommendationResults(
      await fetchSimilarPage(sourceItem.tmdbId, sourceItem.tmdbMediaType),
    ).slice(0, 40),
  );
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return fresh;
  }

  const { error: deleteError } = await admin
    .from("work_recommendation_cache")
    .delete()
    .eq("recommendation_source", "similar")
    .eq("source_tmdb_media_type", sourceItem.tmdbMediaType)
    .eq("source_tmdb_id", sourceItem.tmdbId);

  if (deleteError) {
    throw new Error(`Failed to clear similar cache: ${deleteError.message}`);
  }

  if (fresh.length === 0) {
    return fresh;
  }

  const fetchedAt = new Date().toISOString();
  const expiresAt = buildExpiresAt(SIMILAR_CACHE_TTL_MS);
  const { error: insertError } = await admin.from("work_recommendation_cache").insert(
    fresh.map((result, index) => ({
      recommendation_source: "similar",
      source_tmdb_media_type: sourceItem.tmdbMediaType,
      source_tmdb_id: sourceItem.tmdbId,
      recommended_tmdb_media_type: result.tmdbMediaType,
      recommended_tmdb_id: result.tmdbId,
      rank: index,
      payload: result,
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to write similar cache: ${insertError.message}`);
  }

  return fresh;
}

export async function fetchTmdbSeasonOptions(
  result: TmdbSearchResult,
): Promise<TmdbSeasonOption[]> {
  if (result.tmdbMediaType !== "tv") {
    return [];
  }

  const json = await fetchTmdbJson<TmdbTvDetailsResponse>(`/tv/${result.tmdbId}`, {
    language: "ja-JP",
  });

  return (json.seasons ?? [])
    .filter((season) => season.season_number > 1)
    .map((season) => ({
      seasonNumber: season.season_number,
      title: resolveSeasonTitle(result.title, season.season_number, season.name?.trim()),
      overview: season.overview ?? null,
      posterPath: season.poster_path ?? null,
      releaseDate: season.air_date ?? null,
      episodeCount: typeof season.episode_count === "number" ? season.episode_count : null,
    }));
}

export async function fetchTmdbWorkDetails(target: TmdbSelectionTarget): Promise<TmdbWorkDetails> {
  const path =
    target.tmdbMediaType === "movie"
      ? `/movie/${target.tmdbId}`
      : target.workType === "season"
        ? `/tv/${target.tmdbId}/season/${target.seasonNumber}`
        : `/tv/${target.tmdbId}`;

  const response = await fetchTmdbJson<
    TmdbMovieDetailsResponse | TmdbTvDetailsResponse | TmdbSeasonDetailsResponse
  >(path, { language: "ja-JP" });
  const translatedTitle = await fetchPreferredJapaneseTitle(target);

  if (target.tmdbMediaType === "movie") {
    const json = response as TmdbMovieDetailsResponse;

    return {
      tmdbId: json.id,
      tmdbMediaType: "movie",
      workType: "movie",
      title: firstNonBlank(translatedTitle, json.title, target.title, "Untitled movie"),
      originalTitle: json.original_title ?? target.originalTitle,
      overview: json.overview ?? target.overview,
      posterPath: json.poster_path ?? target.posterPath,
      releaseDate: json.release_date ?? target.releaseDate,
      genres: (json.genres ?? []).map((genre) => genre.name),
      runtimeMinutes: typeof json.runtime === "number" && json.runtime > 0 ? json.runtime : null,
      typicalEpisodeRuntimeMinutes: null,
      episodeCount: null,
      seasonCount: null,
      seasonNumber: null,
    };
  }

  if (target.workType === "season") {
    const seasonJson = response as TmdbSeasonDetailsResponse;
    const seriesJson = await fetchTvSeriesDetails(target.tmdbId);
    const representativeEpisodeRuntime =
      seasonJson.episodes?.find(
        (episode) => typeof episode.runtime === "number" && episode.runtime > 0,
      )?.runtime ??
      (seriesJson.episode_run_time ?? []).find((runtime) => runtime > 0) ??
      null;

    return {
      tmdbId: target.tmdbId,
      tmdbMediaType: "tv",
      workType: "season",
      title: resolveSeasonTitle(
        target.seriesTitle,
        target.seasonNumber,
        translatedTitle,
        seasonJson.name,
        target.title,
      ),
      originalTitle: seasonJson.name,
      overview: seasonJson.overview ?? target.overview,
      posterPath: seasonJson.poster_path ?? target.posterPath,
      releaseDate: seasonJson.air_date ?? target.releaseDate,
      genres: (seriesJson.genres ?? []).map((genre) => genre.name),
      runtimeMinutes: null,
      typicalEpisodeRuntimeMinutes: representativeEpisodeRuntime,
      episodeCount:
        typeof target.episodeCount === "number"
          ? target.episodeCount
          : (seasonJson.episodes?.length ?? null),
      seasonCount: null,
      seasonNumber: target.seasonNumber,
    };
  }

  const json = response as TmdbTvDetailsResponse;
  const season1 = (json.seasons ?? []).find((season) => season.season_number === 1);
  const season1EpisodeCount =
    typeof season1?.episode_count === "number" ? season1.episode_count : null;

  let representativeEpisodeRuntime =
    (json.episode_run_time ?? []).find((runtime) => runtime > 0) ?? null;

  if (representativeEpisodeRuntime === null && season1) {
    representativeEpisodeRuntime = await fetchSeasonEpisodeRuntime(target.tmdbId, 1);
  }

  return {
    tmdbId: json.id,
    tmdbMediaType: "tv",
    workType: "series",
    title: firstNonBlank(translatedTitle, json.name, target.title, "Untitled series"),
    originalTitle: json.original_name ?? target.originalTitle,
    overview: json.overview ?? target.overview,
    posterPath: json.poster_path ?? target.posterPath,
    releaseDate: json.first_air_date ?? target.releaseDate,
    genres: (json.genres ?? []).map((genre) => genre.name),
    runtimeMinutes: null,
    typicalEpisodeRuntimeMinutes: representativeEpisodeRuntime,
    episodeCount: season1EpisodeCount,
    seasonCount:
      typeof json.number_of_seasons === "number" && json.number_of_seasons >= 0
        ? json.number_of_seasons
        : null,
    seasonNumber: null,
  };
}

async function fetchPreferredJapaneseTitle(target: TmdbSelectionTarget) {
  const path =
    target.tmdbMediaType === "movie"
      ? `/movie/${target.tmdbId}/translations`
      : target.workType === "season"
        ? `/tv/${target.tmdbId}/season/${target.seasonNumber}/translations`
        : `/tv/${target.tmdbId}/translations`;

  try {
    const json = await fetchTmdbJson<TmdbTranslationsResponse>(path, {});
    const japaneseTranslation =
      json.translations?.find(
        (translation) => translation.iso_639_1 === "ja" && translation.iso_3166_1 === "JP",
      ) ?? json.translations?.find((translation) => translation.iso_639_1 === "ja");

    if (!japaneseTranslation?.data) {
      return null;
    }

    return target.tmdbMediaType === "movie"
      ? (japaneseTranslation.data.title ?? null)
      : (japaneseTranslation.data.name ?? null);
  } catch {
    return null;
  }
}

async function fetchTvSeriesDetails(tmdbId: number) {
  return fetchTmdbJson<TmdbTvDetailsResponse>(`/tv/${tmdbId}`, { language: "ja-JP" });
}

async function fetchSeasonEpisodeRuntime(
  tmdbId: number,
  seasonNumber: number,
): Promise<number | null> {
  try {
    const json = await fetchTmdbJson<TmdbSeasonDetailsResponse>(
      `/tv/${tmdbId}/season/${seasonNumber}`,
      {
        language: "ja-JP",
      },
    );

    return (
      json.episodes?.find((episode) => typeof episode.runtime === "number" && episode.runtime > 0)
        ?.runtime ?? null
    );
  } catch {
    return null;
  }
}

function firstNonBlank(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function resolveSeasonTitle(
  seriesTitle: string,
  seasonNumber: number,
  ...candidates: Array<string | null | undefined>
) {
  const fallback = `${seriesTitle} シーズン${seasonNumber}`;
  const chosen = firstNonBlank(...candidates);

  if (!chosen || isGenericSeasonLabel(chosen)) {
    return fallback;
  }

  if (chosen.toLowerCase().includes(seriesTitle.toLowerCase())) {
    return chosen;
  }

  return `${seriesTitle} ${chosen}`;
}

function isGenericSeasonLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    /^season\s*\d+$/i.test(value.trim()) ||
    /^シーズン\s*\d+$/.test(value.trim()) ||
    normalized === "season" ||
    normalized === "シーズン"
  );
}
