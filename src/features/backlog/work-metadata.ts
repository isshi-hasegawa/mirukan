import type { TmdbWorkDetails } from "../../lib/tmdb.ts";
import { buildSearchText } from "./helpers.ts";

const FOCUS_HIGH_GENRES = new Set([
  "スリラー",
  "ミステリー",
  "ホラー",
  "戦争",
  "戦争&政治",
  "歴史",
  "ドキュメンタリー",
]);
const FOCUS_LOW_GENRES = new Set([
  "コメディ",
  "ロマンス",
  "ファミリー",
  "アニメーション",
  "キッズ",
  "音楽",
  "リアリティ",
  "ソープ",
  "トーク",
]);
const BG_HIGH_GENRES = new Set([
  "コメディ",
  "アニメーション",
  "ファミリー",
  "キッズ",
  "音楽",
  "リアリティ",
  "トーク",
  "ソープ",
]);
const BG_MED_GENRES = new Set([
  "アクション",
  "アドベンチャー",
  "アクション&アドベンチャー",
  "ロマンス",
  "SF&ファンタジー",
  "西部劇",
]);
const BG_LOW_GENRES = new Set([
  "スリラー",
  "ミステリー",
  "ホラー",
  "戦争",
  "戦争&政治",
  "歴史",
  "ドキュメンタリー",
]);

export function calcCompletionLoadScore(details: TmdbWorkDetails): number {
  const minutes =
    details.workType === "movie" ? details.runtimeMinutes : details.typicalEpisodeRuntimeMinutes;

  const bucket = getDurationBucket(minutes);
  if (bucket === "short") return 0;
  if (bucket === "medium") return 25;
  if (bucket === "long") return 50;
  if (bucket === "very_long") return 75;
  return 50;
}

export function calcFocusRequiredScore(genres: string[]): number {
  if (genres.some((genre) => FOCUS_HIGH_GENRES.has(genre))) return 75;
  if (genres.some((genre) => FOCUS_LOW_GENRES.has(genre))) return 25;
  return 50;
}

export function calcBackgroundFitScore(genres: string[]): number {
  if (genres.some((genre) => BG_LOW_GENRES.has(genre))) return 0;
  if (genres.some((genre) => BG_HIGH_GENRES.has(genre))) return 75;
  if (genres.some((genre) => BG_MED_GENRES.has(genre))) return 50;
  return 25;
}

export function getDurationBucket(minutes: number | null) {
  if (minutes === null) {
    return null;
  }

  if (minutes <= 30) {
    return "short" as const;
  }

  if (minutes <= 70) {
    return "medium" as const;
  }

  if (minutes <= 120) {
    return "long" as const;
  }

  return "very_long" as const;
}

export function buildTmdbWorkUpdate(details: TmdbWorkDetails, syncedAt = new Date().toISOString()) {
  return {
    title: details.title,
    original_title: details.originalTitle,
    search_text: buildSearchText(
      [details.title, details.originalTitle, ...details.genres].filter(Boolean).join(" "),
    ),
    overview: details.overview,
    poster_path: details.posterPath,
    release_date: details.releaseDate,
    runtime_minutes: details.runtimeMinutes,
    typical_episode_runtime_minutes: details.typicalEpisodeRuntimeMinutes,
    duration_bucket: getDurationBucket(
      details.runtimeMinutes ?? details.typicalEpisodeRuntimeMinutes,
    ),
    episode_count: details.episodeCount,
    season_count: details.seasonCount,
    season_number: details.seasonNumber,
    genres: details.genres,
    focus_required_score: calcFocusRequiredScore(details.genres),
    background_fit_score: calcBackgroundFitScore(details.genres),
    completion_load_score: calcCompletionLoadScore(details),
    last_tmdb_synced_at: syncedAt,
    imdb_id: details.imdbId,
  };
}
