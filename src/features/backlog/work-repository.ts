import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase.ts";
import {
  fetchTmdbWorkDetails,
  type TmdbSeasonOption,
  type TmdbSeasonSelectionTarget,
  type TmdbSearchResult,
  type TmdbSelectionTarget,
  type TmdbWorkDetails,
} from "../../lib/tmdb.ts";
import { buildSearchText } from "./helpers.ts";
import type { WorkType } from "./types.ts";

const TMDB_WORK_REFRESH_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

export function shouldRefreshTmdbWork(
  lastSyncedAt: string | null,
  now = Date.now(),
  refreshIntervalMs = TMDB_WORK_REFRESH_INTERVAL_MS,
) {
  if (!lastSyncedAt) {
    return true;
  }

  const syncedAtMs = Date.parse(lastSyncedAt);
  if (Number.isNaN(syncedAtMs)) {
    return true;
  }

  return now - syncedAtMs >= refreshIntervalMs;
}

export async function upsertTmdbWork(
  target: TmdbSelectionTarget,
  userId: string,
): Promise<PostgrestSingleResponse<{ id: string }>> {
  if (target.workType === "season") {
    return upsertTmdbSeasonWork(target, userId);
  }

  const workType = target.workType as Extract<WorkType, "movie" | "series">;
  const { data: existing, error: selectError } = await supabase
    .from("works")
    .select("id, last_tmdb_synced_at")
    .eq("source_type", "tmdb")
    .eq("tmdb_media_type", target.tmdbMediaType)
    .eq("tmdb_id", target.tmdbId)
    .eq("work_type", workType)
    .maybeSingle();

  if (selectError) {
    return { data: null, error: selectError, count: null, status: 400, statusText: "Bad Request" };
  }

  if (existing && !shouldRefreshTmdbWork(existing.last_tmdb_synced_at)) {
    return { data: { id: existing.id }, error: null, count: null, status: 200, statusText: "OK" };
  }

  const details = await fetchTmdbWorkDetails(target);

  if (existing) {
    const { error: updateError } = await supabase
      .from("works")
      .update(buildTmdbWorkUpdate(details))
      .eq("id", existing.id);

    if (updateError) {
      return {
        data: null,
        error: updateError,
        count: null,
        status: 400,
        statusText: "Bad Request",
      };
    }

    return { data: existing, error: null, count: null, status: 200, statusText: "OK" };
  }

  return supabase
    .from("works")
    .insert(buildTmdbWorkInsert(details, userId, workType))
    .select("id")
    .single();
}

export async function upsertManualWork(
  title: string,
  workType: Extract<WorkType, "movie" | "series">,
  userId: string,
): Promise<PostgrestSingleResponse<{ id: string }>> {
  const searchText = buildSearchText(title);
  const { data: existing, error: selectError } = await supabase
    .from("works")
    .select("id")
    .eq("created_by", userId)
    .eq("source_type", "manual")
    .eq("work_type", workType)
    .eq("search_text", searchText)
    .maybeSingle();

  if (selectError) {
    return { data: null, error: selectError, count: null, status: 400, statusText: "Bad Request" };
  }

  if (existing) {
    return { data: existing, error: null, count: null, status: 200, statusText: "OK" };
  }

  const insertResult = await supabase
    .from("works")
    .insert({
      created_by: userId,
      source_type: "manual",
      work_type: workType,
      title,
      search_text: searchText,
    })
    .select("id")
    .single();

  if (insertResult.error?.code !== "23505") {
    return insertResult;
  }

  const { data: conflicted, error: conflictError } = await supabase
    .from("works")
    .select("id")
    .eq("created_by", userId)
    .eq("source_type", "manual")
    .eq("work_type", workType)
    .eq("search_text", searchText)
    .maybeSingle();

  if (conflictError) {
    return {
      data: null,
      error: conflictError,
      count: null,
      status: 409,
      statusText: "Conflict",
    };
  }

  return {
    data: conflicted,
    error: conflicted ? null : insertResult.error,
    count: null,
    status: conflicted ? 200 : 409,
    statusText: conflicted ? "OK" : "Conflict",
  };
}

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

export function buildSelectedSeasonTargets(
  seriesResult: TmdbSearchResult,
  seasonOptions: TmdbSeasonOption[],
  seasonNumbers: number[],
): TmdbSelectionTarget[] {
  const normalizedSeasonNumbers = [...new Set(seasonNumbers)].sort((left, right) => left - right);
  const seasonOptionsByNumber = new Map(
    seasonOptions.map((season) => [season.seasonNumber, season] as const),
  );

  return normalizedSeasonNumbers.map((seasonNumber) => {
    if (seasonNumber === 1) {
      return seriesResult;
    }

    const season = seasonOptionsByNumber.get(seasonNumber);
    if (!season) {
      throw new Error(`シーズン${seasonNumber}の情報が見つかりません`);
    }

    return {
      tmdbId: seriesResult.tmdbId,
      tmdbMediaType: "tv",
      workType: "season",
      title: season.title,
      originalTitle: seriesResult.originalTitle,
      overview: season.overview,
      posterPath: season.posterPath,
      releaseDate: season.releaseDate,
      seasonNumber,
      episodeCount: season.episodeCount,
      seriesTitle: seriesResult.title,
    };
  });
}

type ResolveSelectedSeasonWorkIdsOptions = {
  seasonOptions: TmdbSeasonOption[];
};

export async function resolveSelectedSeasonWorkIds(
  seriesResult: TmdbSearchResult,
  userId: string,
  seasonNumbers: number[],
  options: ResolveSelectedSeasonWorkIdsOptions,
): Promise<{ error: string | null; workIds: string[] }> {
  if (seasonNumbers.length === 0) {
    return { error: "追加するシーズンを1つ以上選択してください", workIds: [] };
  }

  let targets: TmdbSelectionTarget[] = [];
  try {
    targets = buildSelectedSeasonTargets(seriesResult, options.seasonOptions, seasonNumbers);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "シーズン情報の組み立てに失敗しました",
      workIds: [],
    };
  }

  const workIds: string[] = [];
  for (const target of targets) {
    const seasonWork = await upsertTmdbWork(target, userId);
    if (seasonWork.error || !seasonWork.data) {
      const label = target.workType === "season" ? `シーズン${target.seasonNumber}` : "シーズン1";
      return {
        error: seasonWork.error?.message ?? `${label}の保存に失敗しました`,
        workIds: [],
      };
    }
    workIds.push(seasonWork.data.id);
  }

  return { error: null, workIds };
}

function buildTmdbWorkInsert(
  details: TmdbWorkDetails,
  userId: string,
  workType: WorkType,
  parentWorkId: string | null = null,
) {
  return {
    created_by: userId,
    source_type: "tmdb" as const,
    tmdb_media_type: details.tmdbMediaType,
    tmdb_id: details.tmdbId,
    work_type: workType,
    parent_work_id: parentWorkId,
    ...buildTmdbWorkUpdate(details),
  };
}

function buildTmdbWorkUpdate(details: TmdbWorkDetails) {
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
    last_tmdb_synced_at: new Date().toISOString(),
  };
}

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

function calcFocusRequiredScore(genres: string[]): number {
  if (genres.some((genre) => FOCUS_HIGH_GENRES.has(genre))) return 75;
  if (genres.some((genre) => FOCUS_LOW_GENRES.has(genre))) return 25;
  return 50;
}

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

function calcBackgroundFitScore(genres: string[]): number {
  if (genres.some((genre) => BG_LOW_GENRES.has(genre))) return 0;
  if (genres.some((genre) => BG_HIGH_GENRES.has(genre))) return 75;
  if (genres.some((genre) => BG_MED_GENRES.has(genre))) return 50;
  return 25;
}

async function upsertTmdbSeasonWork(
  target: TmdbSeasonSelectionTarget,
  userId: string,
): Promise<PostgrestSingleResponse<{ id: string }>> {
  if (target.seasonNumber === 1) {
    const seriesTarget: TmdbSearchResult = {
      tmdbId: target.tmdbId,
      tmdbMediaType: "tv",
      workType: "series",
      title: target.seriesTitle,
      originalTitle: target.originalTitle,
      overview: target.overview,
      posterPath: target.posterPath,
      releaseDate: target.releaseDate,
    };
    return upsertTmdbWork(seriesTarget, userId);
  }

  const seriesTarget: TmdbSearchResult = {
    tmdbId: target.tmdbId,
    tmdbMediaType: "tv",
    workType: "series",
    title: target.seriesTitle,
    originalTitle: target.originalTitle,
    overview: target.overview,
    posterPath: target.posterPath,
    releaseDate: target.releaseDate,
  };
  const seriesResult = await upsertTmdbWork(seriesTarget, userId);

  if (seriesResult.error || !seriesResult.data) {
    return seriesResult as PostgrestSingleResponse<{ id: string }>;
  }

  const { data: existing, error: selectError } = await supabase
    .from("works")
    .select("id, last_tmdb_synced_at")
    .eq("source_type", "tmdb")
    .eq("tmdb_media_type", "tv")
    .eq("tmdb_id", target.tmdbId)
    .eq("work_type", "season")
    .eq("season_number", target.seasonNumber)
    .maybeSingle();

  if (selectError) {
    return { data: null, error: selectError, count: null, status: 400, statusText: "Bad Request" };
  }

  if (existing && !shouldRefreshTmdbWork(existing.last_tmdb_synced_at)) {
    return { data: { id: existing.id }, error: null, count: null, status: 200, statusText: "OK" };
  }

  const details = await fetchTmdbWorkDetails(target);

  if (existing) {
    const { error: updateError } = await supabase
      .from("works")
      .update({
        ...buildTmdbWorkUpdate(details),
        parent_work_id: seriesResult.data.id,
      })
      .eq("id", existing.id);

    if (updateError) {
      return {
        data: null,
        error: updateError,
        count: null,
        status: 400,
        statusText: "Bad Request",
      };
    }

    return { data: existing, error: null, count: null, status: 200, statusText: "OK" };
  }

  return supabase
    .from("works")
    .insert(buildTmdbWorkInsert(details, userId, "season", seriesResult.data.id))
    .select("id")
    .single();
}

function getDurationBucket(minutes: number | null) {
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
