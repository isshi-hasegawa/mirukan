import { resolveSeasonTitle as sharedResolveSeasonTitle } from "../../../../src/lib/tmdb-shared.ts";
import { fetchTmdbJson } from "./http.ts";
import {
  type TmdbSearchResult,
  type TmdbSeasonOption,
  type TmdbTvDetailsResponse,
} from "./types.ts";

export { resolveSeasonTitle } from "../../../../src/lib/tmdb-shared.ts";

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
      title: sharedResolveSeasonTitle(result.title, season.season_number, season.name?.trim()),
      overview: season.overview ?? null,
      posterPath: season.poster_path ?? null,
      releaseDate: season.air_date ?? null,
      episodeCount: typeof season.episode_count === "number" ? season.episode_count : null,
    }));
}
