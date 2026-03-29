import { env } from "./env.ts";

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

export type TmdbWatchPlatform = {
  key: string;
  logoPath: string | null;
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

// TMDb provider_id → mirukan プラットフォームキーのマッピング（日本向けサブスク）
const TMDB_PROVIDER_ID_MAP: Record<number, string> = {
  8: "netflix", // Netflix
  9: "prime_video", // Amazon Prime Video
  337: "disney_plus", // Disney+
  413: "hulu", // Hulu (Japan)
  350: "apple_tv_plus", // Apple TV+
  2: "apple_tv", // Apple TV
  97: "u_next", // U-NEXT
};

export type TmdbSearchResult = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
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

export type TmdbSeasonOption = {
  seasonNumber: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  episodeCount: number | null;
};

export type TmdbSelectionTarget = TmdbSearchResult | TmdbSeasonSelectionTarget;

export type TmdbWorkDetails = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
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

async function fetchWatchProvidersJP(
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<TmdbWatchPlatform[]> {
  const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/watch/providers`);
  url.searchParams.set("api_key", env.tmdbApiKey);

  const response = await fetch(url);
  if (!response.ok) return [];

  const json = (await response.json()) as TmdbWatchProvidersResponse;
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
}

async function checkJapaneseRelease(tmdbId: number): Promise<boolean> {
  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`);
  url.searchParams.set("api_key", env.tmdbApiKey);

  try {
    const response = await fetch(url);
    if (!response.ok) return true; // API失敗時はデフォルト含める

    const json = (await response.json()) as TmdbReleaseDatesResponse;
    const jpRelease = json.results?.find((r) => r.iso_3166_1 === "JP");
    return jpRelease !== undefined && (jpRelease.release_dates?.length ?? 0) > 0;
  } catch {
    return true;
  }
}

async function enrichWithWatchProviders(results: TmdbSearchResult[]): Promise<TmdbSearchResult[]> {
  return Promise.all(
    results.map(async (result) => {
      const [jpWatchPlatforms, hasJapaneseRelease] = await Promise.all([
        fetchWatchProvidersJP(result.tmdbId, result.tmdbMediaType).catch(() => []),
        result.workType === "movie" ? checkJapaneseRelease(result.tmdbId) : Promise.resolve(true),
      ]);
      return { ...result, jpWatchPlatforms, hasJapaneseRelease };
    }),
  );
}

const TRENDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let trendingCache: { results: TmdbSearchResult[]; fetchedAt: number } | null = null;
let similarCache: { results: TmdbSearchResult[]; fetchedAt: number } | null = null;

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function fetchTrendingPage(page: number): Promise<TmdbSearchResult[]> {
  const url = new URL("https://api.themoviedb.org/3/trending/all/week");
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("page", page.toString());

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDb trending failed with status ${response.status}`);
  }

  const json = (await response.json()) as TmdbMultiSearchResponse;

  return json.results.flatMap((result): TmdbSearchResult[] => {
    if (result.media_type !== "movie" && result.media_type !== "tv") {
      return [];
    }

    const title = result.media_type === "movie" ? result.title : result.name;

    if (!title) {
      return [];
    }

    return [
      {
        tmdbId: result.id,
        tmdbMediaType: result.media_type,
        workType: result.media_type === "movie" ? "movie" : "series",
        title,
        originalTitle:
          result.media_type === "movie"
            ? (result.original_title ?? null)
            : (result.original_name ?? null),
        overview: result.overview ?? null,
        posterPath: result.poster_path ?? null,
        releaseDate:
          result.media_type === "movie"
            ? (result.release_date ?? null)
            : (result.first_air_date ?? null),
        jpWatchPlatforms: [],
        hasJapaneseRelease: true,
      },
    ];
  });
}

async function fetchSimilarPage(
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<TmdbSearchResult[]> {
  const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${tmdbId}/similar`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("page", "1");

  const response = await fetch(url);
  if (!response.ok) return [];

  const json = (await response.json()) as TmdbMultiSearchResponse;

  return json.results.flatMap((result): TmdbSearchResult[] => {
    const title = mediaType === "movie" ? result.title : result.name;
    if (!title) return [];

    return [
      {
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
      },
    ];
  });
}

export async function fetchTmdbSimilar(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): Promise<TmdbSearchResult[]> {
  if (similarCache && Date.now() - similarCache.fetchedAt < TRENDING_CACHE_TTL_MS) {
    return shuffleArray(similarCache.results);
  }

  if (sourceItems.length === 0) {
    return [];
  }

  const pages = await Promise.all(
    sourceItems.slice(0, 5).map((item) => fetchSimilarPage(item.tmdbId, item.tmdbMediaType)),
  );

  const combined = pages.flat();
  const seen = new Set<string>();
  const deduped = combined.filter((item) => {
    const key = `${item.tmdbMediaType}-${item.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const results = await enrichWithWatchProviders(deduped.slice(0, 40));

  similarCache = { results, fetchedAt: Date.now() };
  return shuffleArray(results);
}

export async function fetchMergedRecommendations(
  sourceItems: Array<{ tmdbId: number; tmdbMediaType: "movie" | "tv" }>,
): Promise<TmdbSearchResult[]> {
  const [trending, similar] = await Promise.all([
    fetchTmdbTrending(),
    fetchTmdbSimilar(sourceItems),
  ]);

  const combined = [...trending, ...similar];
  const seen = new Set<string>();
  const deduped = combined.filter((item) => {
    const key = `${item.tmdbMediaType}-${item.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return shuffleArray(deduped);
}

export async function fetchTmdbTrending(): Promise<TmdbSearchResult[]> {
  if (trendingCache && Date.now() - trendingCache.fetchedAt < TRENDING_CACHE_TTL_MS) {
    return shuffleArray(trendingCache.results);
  }

  const pages = await Promise.all([
    fetchTrendingPage(1),
    fetchTrendingPage(2),
    fetchTrendingPage(3),
  ]);

  const combined = pages.flat();
  const seen = new Set<number>();
  const deduped = combined.filter((item) => {
    if (seen.has(item.tmdbId)) return false;
    seen.add(item.tmdbId);
    return true;
  });

  const results = await enrichWithWatchProviders(deduped);

  trendingCache = { results, fetchedAt: Date.now() };
  return shuffleArray(results);
}

export async function searchTmdbWorks(query: string) {
  const url = new URL("https://api.themoviedb.org/3/search/multi");
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "ja-JP");
  url.searchParams.set("include_adult", "false");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDb search failed with status ${response.status}`);
  }

  const json = (await response.json()) as TmdbMultiSearchResponse;

  const base = json.results.flatMap((result): TmdbSearchResult[] => {
    if (result.media_type !== "movie" && result.media_type !== "tv") {
      return [];
    }

    const title = result.media_type === "movie" ? result.title : result.name;

    if (!title) {
      return [];
    }

    return [
      {
        tmdbId: result.id,
        tmdbMediaType: result.media_type,
        workType: result.media_type === "movie" ? "movie" : "series",
        title,
        originalTitle:
          result.media_type === "movie"
            ? (result.original_title ?? null)
            : (result.original_name ?? null),
        overview: result.overview ?? null,
        posterPath: result.poster_path ?? null,
        releaseDate:
          result.media_type === "movie"
            ? (result.release_date ?? null)
            : (result.first_air_date ?? null),
        jpWatchPlatforms: [],
        hasJapaneseRelease: true,
      },
    ];
  });

  return enrichWithWatchProviders(base);
}

export async function fetchTmdbSeasonOptions(
  result: TmdbSearchResult,
): Promise<TmdbSeasonOption[]> {
  if (result.tmdbMediaType !== "tv") {
    return [];
  }

  const url = new URL(`https://api.themoviedb.org/3/tv/${result.tmdbId}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "ja-JP");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDb tv details failed with status ${response.status}`);
  }

  const json = (await response.json()) as TmdbTvDetailsResponse;

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

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "ja-JP");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDb details failed with status ${response.status}`);
  }

  const translatedTitle = await fetchPreferredJapaneseTitle(target);

  if (target.tmdbMediaType === "movie") {
    const json = (await response.json()) as TmdbMovieDetailsResponse;

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
    const [seasonJson, seriesJson] = await Promise.all([
      response.json() as Promise<TmdbSeasonDetailsResponse>,
      fetchTvSeriesDetails(target.tmdbId),
    ]);
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

  const json = (await response.json()) as TmdbTvDetailsResponse;

  // S1 の情報を取得（series = S1 を兼ねるため）
  const season1 = (json.seasons ?? []).find((s) => s.season_number === 1);
  const season1EpisodeCount =
    typeof season1?.episode_count === "number" ? season1.episode_count : null;

  // 1話あたりの尺: S1 のエピソードから取得を試み、なければシリーズ全体の値を使う
  let representativeEpisodeRuntime =
    (json.episode_run_time ?? []).find((runtime) => runtime > 0) ?? null;
  if (representativeEpisodeRuntime === null && season1) {
    const s1Details = await fetchSeasonEpisodeRuntime(target.tmdbId, 1);
    representativeEpisodeRuntime = s1Details;
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

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", env.tmdbApiKey);

  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as TmdbTranslationsResponse;
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
}

async function fetchTvSeriesDetails(tmdbId: number) {
  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "ja-JP");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDb tv details failed with status ${response.status}`);
  }

  return (await response.json()) as TmdbTvDetailsResponse;
}

async function fetchSeasonEpisodeRuntime(
  tmdbId: number,
  seasonNumber: number,
): Promise<number | null> {
  const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "ja-JP");

  const response = await fetch(url);
  if (!response.ok) return null;

  const json = (await response.json()) as TmdbSeasonDetailsResponse;
  return (
    json.episodes?.find((ep) => typeof ep.runtime === "number" && ep.runtime > 0)?.runtime ?? null
  );
}

function firstNonBlank(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function resolveSeasonTitle(
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
