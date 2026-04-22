import { resolveSeasonTitle } from "../../../../src/lib/tmdb-shared.ts";
import { fetchTmdbJson } from "./http.ts";
import {
  type TmdbSearchResult,
  type TmdbSeasonOption,
  type TmdbTvDetailsResponse,
} from "./types.ts";

export { resolveSeasonTitle };

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
