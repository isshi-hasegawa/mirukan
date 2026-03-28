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

export type TmdbSearchResult = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  workType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
};

export type TmdbWorkDetails = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  workType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  typicalEpisodeRuntimeMinutes: number | null;
  seasonCount: number | null;
};

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
      },
    ];
  });
}

export async function fetchTmdbWorkDetails(result: TmdbSearchResult): Promise<TmdbWorkDetails> {
  const path =
    result.tmdbMediaType === "movie" ? `/movie/${result.tmdbId}` : `/tv/${result.tmdbId}`;

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "ja-JP");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TMDb details failed with status ${response.status}`);
  }

  const translatedTitle = await fetchPreferredJapaneseTitle(result);

  if (result.tmdbMediaType === "movie") {
    const json = (await response.json()) as TmdbMovieDetailsResponse;

    return {
      tmdbId: json.id,
      tmdbMediaType: "movie",
      workType: "movie",
      title: translatedTitle ?? json.title,
      originalTitle: json.original_title ?? result.originalTitle,
      overview: json.overview ?? result.overview,
      posterPath: json.poster_path ?? result.posterPath,
      releaseDate: json.release_date ?? result.releaseDate,
      genres: (json.genres ?? []).map((genre) => genre.name),
      runtimeMinutes: typeof json.runtime === "number" && json.runtime > 0 ? json.runtime : null,
      typicalEpisodeRuntimeMinutes: null,
      seasonCount: null,
    };
  }

  const json = (await response.json()) as TmdbTvDetailsResponse;
  const representativeEpisodeRuntime =
    (json.episode_run_time ?? []).find((runtime) => runtime > 0) ?? null;

  return {
    tmdbId: json.id,
    tmdbMediaType: "tv",
    workType: "series",
    title: translatedTitle ?? json.name,
    originalTitle: json.original_name ?? result.originalTitle,
    overview: json.overview ?? result.overview,
    posterPath: json.poster_path ?? result.posterPath,
    releaseDate: json.first_air_date ?? result.releaseDate,
    genres: (json.genres ?? []).map((genre) => genre.name),
    runtimeMinutes: null,
    typicalEpisodeRuntimeMinutes: representativeEpisodeRuntime,
    seasonCount:
      typeof json.number_of_seasons === "number" && json.number_of_seasons >= 0
        ? json.number_of_seasons
        : null,
  };
}

async function fetchPreferredJapaneseTitle(result: TmdbSearchResult) {
  const path =
    result.tmdbMediaType === "movie"
      ? `/movie/${result.tmdbId}/translations`
      : `/tv/${result.tmdbId}/translations`;

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

  return result.tmdbMediaType === "movie"
    ? (japaneseTranslation.data.title ?? null)
    : (japaneseTranslation.data.name ?? null);
}
