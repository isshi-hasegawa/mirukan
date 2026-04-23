import type { IncomingMessage, ServerResponse } from "node:http";
import {
  DEFAULT_IMDB_ID,
  DEFAULT_RELEASE_DATE,
  DEFAULT_WORK_ORIGINAL_TITLE,
  DEFAULT_WORK_OVERVIEW,
  DEFAULT_WORK_TITLE,
} from "./constants.ts";
import { json, readJson } from "./http.ts";

function resolveTmdbWorkType(target: Record<string, unknown>) {
  if (target.workType === "season") {
    return "season";
  }
  if (target.workType === "series") {
    return "series";
  }
  return "movie";
}

function readStringValue(target: Record<string, unknown>, key: string, fallback: string) {
  return typeof target[key] === "string" ? target[key] : fallback;
}

function readNullableStringValue(
  target: Record<string, unknown>,
  key: string,
  fallback: string | null,
) {
  const value = target[key];
  return typeof value === "string" || value === null ? value : fallback;
}

function readNullableNumberValue(target: Record<string, unknown>, key: string) {
  return typeof target[key] === "number" ? target[key] : null;
}

function createTmdbWorkDetails(target: Record<string, unknown>) {
  const workType = resolveTmdbWorkType(target);
  const isMovie = workType === "movie";

  return {
    tmdbId: readNullableNumberValue(target, "tmdbId") ?? 777002,
    tmdbMediaType: target.tmdbMediaType === "tv" ? "tv" : "movie",
    workType,
    title: readStringValue(target, "title", DEFAULT_WORK_TITLE),
    originalTitle: readNullableStringValue(target, "originalTitle", DEFAULT_WORK_ORIGINAL_TITLE),
    overview: readNullableStringValue(target, "overview", DEFAULT_WORK_OVERVIEW),
    posterPath: readNullableStringValue(target, "posterPath", null),
    releaseDate: readStringValue(target, "releaseDate", DEFAULT_RELEASE_DATE),
    genres: isMovie ? ["Drama"] : ["Drama", "Crime"],
    runtimeMinutes: isMovie ? 110 : null,
    typicalEpisodeRuntimeMinutes: isMovie ? null : 47,
    episodeCount: readNullableNumberValue(target, "episodeCount"),
    seasonCount: workType === "series" ? 3 : null,
    seasonNumber: readNullableNumberValue(target, "seasonNumber"),
    imdbId: DEFAULT_IMDB_ID,
  };
}

const functionResponses: Record<string, (body: Record<string, unknown>) => unknown> = {
  "fetch-tmdb-trending": () => [
    {
      tmdbId: 777001,
      tmdbMediaType: "movie",
      workType: "movie",
      title: "おすすめ作品",
      originalTitle: "Recommended Work",
      overview: "initial recommendation",
      posterPath: null,
      releaseDate: "2024-01-01",
      jpWatchPlatforms: [],
      hasJapaneseRelease: true,
    },
  ],
  "fetch-tmdb-similar": () => [],
  "search-tmdb-works": (body) => {
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query) {
      return [];
    }

    return [
      {
        tmdbId: 777002,
        tmdbMediaType: "movie",
        workType: "movie",
        title: `検索結果 ${query}`.trim(),
        originalTitle: "Search Result",
        overview: "search result overview",
        posterPath: null,
        releaseDate: DEFAULT_RELEASE_DATE,
        jpWatchPlatforms: [],
        hasJapaneseRelease: true,
      },
    ];
  },
  "fetch-tmdb-season-options": () => [],
  "fetch-tmdb-work-details": (body) =>
    createTmdbWorkDetails((body.target as Record<string, unknown>) ?? {}),
  "suggest-display-title": () => ({ title: null }),
  "fetch-omdb-work-details": () => ({
    rottenTomatoesScore: 96,
    imdbRating: 9.5,
    imdbVotes: 2300000,
    metacriticScore: 87,
  }),
};

export async function handleFunctions(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "POST" || !url.pathname.startsWith("/functions/v1/")) {
    return false;
  }

  const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;
  const functionName = url.pathname.replace("/functions/v1/", "");
  const responder = functionResponses[functionName];

  if (!responder) {
    json(res, 404, { error: `Unknown function: ${functionName}` });
    return true;
  }

  json(res, 200, responder(body));
  return true;
}
