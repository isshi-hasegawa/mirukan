import { fetchTmdbJson, firstNonBlank } from "./http.ts";
import { fetchPreferredJapaneseTitleForPath } from "./localization.ts";
import { fetchImdbId } from "./omdb-enrich.ts";
import { resolveSeasonTitle } from "./seasons.ts";
import {
  type TmdbMediaType,
  type TmdbMovieDetailsResponse,
  type TmdbSeasonDetailsResponse,
  type TmdbSelectionTarget,
  type TmdbTvDetailsResponse,
  type TmdbWorkDetails,
} from "./types.ts";

function buildTmdbWorkDetailsPath(target: TmdbSelectionTarget): string {
  if (target.tmdbMediaType === "movie") {
    return `/movie/${target.tmdbId}`;
  }

  if (target.workType === "season") {
    return `/tv/${target.tmdbId}/season/${target.seasonNumber}`;
  }

  return `/tv/${target.tmdbId}`;
}

export async function fetchTmdbWorkDetails(target: TmdbSelectionTarget): Promise<TmdbWorkDetails> {
  const path = buildTmdbWorkDetailsPath(target);

  const [response, translatedTitle, imdbId] = await Promise.all([
    fetchTmdbJson<TmdbMovieDetailsResponse | TmdbTvDetailsResponse | TmdbSeasonDetailsResponse>(
      path,
      { language: "ja-JP" },
    ),
    fetchPreferredJapaneseTitle(target),
    fetchImdbId(target.tmdbId, target.tmdbMediaType),
  ]);

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
      imdbId,
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
      imdbId,
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
    imdbId,
  };
}

async function fetchPreferredJapaneseTitle(target: TmdbSelectionTarget) {
  let path = `/tv/${target.tmdbId}/translations`;

  if (target.tmdbMediaType === "movie") {
    path = `/movie/${target.tmdbId}/translations`;
  } else if (target.workType === "season") {
    path = `/tv/${target.tmdbId}/season/${target.seasonNumber}/translations`;
  }

  return fetchPreferredJapaneseTitleForPath(path, target.tmdbMediaType);
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
