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
