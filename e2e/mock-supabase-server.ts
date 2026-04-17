import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const HOST = "127.0.0.1";
const PORT = Number(process.env.MOCK_SUPABASE_PORT || "55432");
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";
const TEST_USER_SECRET =
  process.env.TEST_USER_PASSWORD || process.env.TEST_USER_SECRET || "ci-login-token";
const TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const ACCESS_TOKEN = "mock-access-token";
const REFRESH_TOKEN = "mock-refresh-token";
const TOKEN_EXPIRES_IN = 60 * 60;
const DEFAULT_RELEASE_DATE = "2025-02-02";
const DEFAULT_WORK_TITLE = "テスト作品";
const DEFAULT_WORK_ORIGINAL_TITLE = "Test Work";
const DEFAULT_WORK_OVERVIEW = "overview";
const DEFAULT_IMDB_ID = "tt7654321";

type Work = {
  id: string;
  created_by: string;
  source_type: "tmdb" | "manual";
  tmdb_media_type: "movie" | "tv" | null;
  tmdb_id: number | null;
  work_type: "movie" | "series" | "season";
  parent_work_id: string | null;
  title: string;
  original_title: string | null;
  search_text: string;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  typical_episode_runtime_minutes: number | null;
  duration_bucket: "short" | "medium" | "long" | "very_long" | null;
  episode_count: number | null;
  season_count: number | null;
  season_number: number | null;
  genres: string[];
  focus_required_score: number | null;
  background_fit_score: number | null;
  completion_load_score: number | null;
  imdb_id: string | null;
  omdb_fetched_at: string | null;
  rotten_tomatoes_score: number | null;
  imdb_rating: number | null;
  imdb_votes: number | null;
  metacritic_score: number | null;
  last_tmdb_synced_at: string | null;
  series_title: string | null;
};

type BacklogItem = {
  id: string;
  user_id: string;
  work_id: string;
  status: "stacked" | "want_to_watch" | "watching" | "interrupted" | "watched";
  primary_platform:
    | "netflix"
    | "prime_video"
    | "u_next"
    | "disney_plus"
    | "hulu"
    | "apple_tv_plus"
    | "apple_tv"
    | null;
  note: string | null;
  sort_order: number;
  display_title: string | null;
  created_at: string;
};

type SessionUser = {
  id: string;
  aud: "authenticated";
  role: "authenticated";
  email: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: { provider: "email"; providers: ["email"] };
  user_metadata: { name: string };
  identities: [];
  created_at: string;
  updated_at: string;
  is_anonymous: false;
};

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) => Promise<boolean> | boolean;

const sessionUser: SessionUser = {
  id: TEST_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: TEST_USER_EMAIL,
  email_confirmed_at: "2026-04-01T00:00:00.000Z",
  phone: "",
  confirmed_at: "2026-04-01T00:00:00.000Z",
  last_sign_in_at: "2026-04-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Akari" },
  identities: [],
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
  is_anonymous: false,
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, accept-profile, content-profile",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-expose-headers": "content-range, x-supabase-api-version",
};

let nextWorkId = 1;
let nextBacklogItemId = 1;

function createSearchText(title: string) {
  return title.trim().toLowerCase();
}

function createWork(
  overrides: Partial<Work> & Pick<Work, "id" | "title" | "source_type" | "work_type">,
): Work {
  return {
    id: overrides.id,
    created_by: overrides.created_by ?? TEST_USER_ID,
    source_type: overrides.source_type,
    tmdb_media_type: overrides.tmdb_media_type ?? null,
    tmdb_id: overrides.tmdb_id ?? null,
    work_type: overrides.work_type,
    parent_work_id: overrides.parent_work_id ?? null,
    title: overrides.title,
    original_title: overrides.original_title ?? null,
    search_text: overrides.search_text ?? createSearchText(overrides.title),
    overview: overrides.overview ?? null,
    poster_path: overrides.poster_path ?? null,
    release_date: overrides.release_date ?? null,
    runtime_minutes: overrides.runtime_minutes ?? null,
    typical_episode_runtime_minutes: overrides.typical_episode_runtime_minutes ?? null,
    duration_bucket: overrides.duration_bucket ?? null,
    episode_count: overrides.episode_count ?? null,
    season_count: overrides.season_count ?? null,
    season_number: overrides.season_number ?? null,
    genres: overrides.genres ?? [],
    focus_required_score: overrides.focus_required_score ?? null,
    background_fit_score: overrides.background_fit_score ?? null,
    completion_load_score: overrides.completion_load_score ?? null,
    imdb_id: overrides.imdb_id ?? null,
    omdb_fetched_at: overrides.omdb_fetched_at ?? null,
    rotten_tomatoes_score: overrides.rotten_tomatoes_score ?? null,
    imdb_rating: overrides.imdb_rating ?? null,
    imdb_votes: overrides.imdb_votes ?? null,
    metacritic_score: overrides.metacritic_score ?? null,
    last_tmdb_synced_at: overrides.last_tmdb_synced_at ?? null,
    series_title: overrides.series_title ?? null,
  };
}

function createBacklogItem(
  overrides: Partial<BacklogItem> & Pick<BacklogItem, "id" | "work_id" | "status" | "created_at">,
): BacklogItem {
  return {
    id: overrides.id,
    user_id: overrides.user_id ?? TEST_USER_ID,
    work_id: overrides.work_id,
    status: overrides.status,
    primary_platform: overrides.primary_platform ?? null,
    note: overrides.note ?? null,
    sort_order: overrides.sort_order ?? 1000,
    display_title: overrides.display_title ?? null,
    created_at: overrides.created_at,
  };
}

const works = new Map<string, Work>([
  [
    "work-manual-movie",
    createWork({
      id: "work-manual-movie",
      title: "遠い街の休日",
      source_type: "manual",
      work_type: "movie",
      overview: "配信では見つからなかったので手動で積んだ、しっとり系のヒューマンドラマ。",
      release_date: "2018-04-13",
      runtime_minutes: 95,
      duration_bucket: "long",
      genres: ["Drama", "Family"],
      focus_required_score: 50,
      background_fit_score: 25,
      completion_load_score: 25,
    }),
  ],
  [
    "work-manual-series",
    createWork({
      id: "work-manual-series",
      title: "週末メモリーズ",
      source_type: "manual",
      work_type: "series",
      overview: "あとで配信先を調べたい、雑談向きの軽めシリーズ。",
      release_date: "2021-10-08",
      typical_episode_runtime_minutes: 24,
      duration_bucket: "short",
      season_count: 10,
      genres: ["Comedy"],
      focus_required_score: 25,
      background_fit_score: 75,
      completion_load_score: 25,
    }),
  ],
  [
    "work-breaking-bad",
    createWork({
      id: "work-breaking-bad",
      title: "ブレイキング・バッド",
      source_type: "tmdb",
      work_type: "series",
      tmdb_media_type: "tv",
      tmdb_id: 1396,
      original_title: "Breaking Bad",
      search_text: "ブレイキング・バッド breaking bad",
      overview:
        "A high school chemistry teacher turned meth producer navigates danger, pride, and family collapse.",
      poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
      release_date: "2008-01-20",
      typical_episode_runtime_minutes: 47,
      duration_bucket: "medium",
      season_count: 5,
      genres: ["Drama", "Crime"],
      focus_required_score: 75,
      background_fit_score: 0,
      completion_load_score: 100,
      imdb_id: "tt0903747",
      omdb_fetched_at: "2026-04-01T00:00:00.000Z",
      rotten_tomatoes_score: 96,
      imdb_rating: 9.5,
      imdb_votes: 2300000,
      metacritic_score: 87,
      last_tmdb_synced_at: "2026-04-01T00:00:00.000Z",
    }),
  ],
  [
    "work-breaking-bad-season2",
    createWork({
      id: "work-breaking-bad-season2",
      title: "ブレイキング・バッド シーズン2",
      source_type: "tmdb",
      work_type: "season",
      tmdb_media_type: "tv",
      tmdb_id: 1396,
      parent_work_id: "work-breaking-bad",
      original_title: "Breaking Bad Season 2",
      search_text: "ブレイキング・バッド season 2",
      overview: "ウォルターとジェシーの選択がさらに重くなっていく第二シーズン。",
      poster_path: "/eSzpy96DwBujGFj0xMbXBcGcfxX.jpg",
      release_date: "2009-03-08",
      typical_episode_runtime_minutes: 47,
      duration_bucket: "medium",
      episode_count: 13,
      season_number: 2,
      genres: ["Drama", "Crime"],
      focus_required_score: 75,
      background_fit_score: 0,
      completion_load_score: 100,
      imdb_id: "tt0903747",
      omdb_fetched_at: "2026-04-01T00:00:00.000Z",
      rotten_tomatoes_score: 100,
      imdb_rating: 9.4,
      imdb_votes: 500000,
      metacritic_score: 90,
      last_tmdb_synced_at: "2026-04-01T00:00:00.000Z",
      series_title: "ブレイキング・バッド",
    }),
  ],
  [
    "work-matrix",
    createWork({
      id: "work-matrix",
      title: "マトリックス",
      source_type: "tmdb",
      work_type: "movie",
      tmdb_media_type: "movie",
      tmdb_id: 603,
      original_title: "The Matrix",
      search_text: "マトリックス the matrix",
      overview:
        "A computer hacker learns about the true nature of reality and his role in the war against its controllers.",
      poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
      release_date: "1999-03-31",
      runtime_minutes: 136,
      duration_bucket: "very_long",
      genres: ["Action", "Science Fiction"],
      focus_required_score: 75,
      background_fit_score: 25,
      completion_load_score: 50,
      imdb_id: "tt0133093",
      omdb_fetched_at: "2026-04-01T00:00:00.000Z",
      rotten_tomatoes_score: 83,
      imdb_rating: 8.7,
      imdb_votes: 2200000,
      metacritic_score: 73,
      last_tmdb_synced_at: "2026-04-01T00:00:00.000Z",
    }),
  ],
]);

const backlogItems = new Map<string, BacklogItem>([
  [
    "backlog-stacked",
    createBacklogItem({
      id: "backlog-stacked",
      work_id: "work-manual-movie",
      status: "stacked",
      note: "配信先不明。週末に腰を据えて観たい。",
      created_at: "2026-04-10T00:00:00.000Z",
    }),
  ],
  [
    "backlog-want",
    createBacklogItem({
      id: "backlog-want",
      work_id: "work-manual-series",
      status: "want_to_watch",
      note: "軽い気分の日に候補へ回しておく。",
      created_at: "2026-04-11T00:00:00.000Z",
    }),
  ],
  [
    "backlog-watching",
    createBacklogItem({
      id: "backlog-watching",
      work_id: "work-breaking-bad",
      status: "watching",
      primary_platform: "netflix",
      note: "今月の平日夜に少しずつ進める。",
      created_at: "2026-04-12T00:00:00.000Z",
    }),
  ],
  [
    "backlog-interrupted",
    createBacklogItem({
      id: "backlog-interrupted",
      work_id: "work-breaking-bad-season2",
      status: "interrupted",
      primary_platform: "netflix",
      note: "再開ポイント確認待ち。",
      created_at: "2026-04-13T00:00:00.000Z",
    }),
  ],
  [
    "backlog-watched",
    createBacklogItem({
      id: "backlog-watched",
      work_id: "work-matrix",
      status: "watched",
      primary_platform: "prime_video",
      note: "視聴済みだけど比較用に残しているカード。",
      created_at: "2026-04-14T00:00:00.000Z",
    }),
  ],
]);

function json(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {},
) {
  res.writeHead(status, {
    "content-type": "application/json",
    ...corsHeaders,
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function noContent(res: ServerResponse, status = 204, extraHeaders: Record<string, string> = {}) {
  res.writeHead(status, {
    ...corsHeaders,
    ...extraHeaders,
  });
  res.end();
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isNullable(value: unknown) {
  return value === null || value === undefined;
}

function compareFieldValues(leftValue: unknown, rightValue: unknown, direction: "asc" | "desc") {
  if (leftValue === rightValue) {
    return 0;
  }
  if (isNullable(leftValue)) {
    return direction === "desc" ? 1 : -1;
  }
  if (isNullable(rightValue)) {
    return direction === "desc" ? -1 : 1;
  }
  if (leftValue < rightValue) {
    return direction === "desc" ? 1 : -1;
  }
  return direction === "desc" ? -1 : 1;
}

function matchesFilters(row: Record<string, unknown>, url: URL) {
  for (const [key, value] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(key)) {
      continue;
    }
    if (!value.startsWith("eq.")) {
      continue;
    }
    if (String(row[key]) !== value.slice(3)) {
      return false;
    }
  }

  return true;
}

function selectedFields(selectValue: string | null) {
  return (selectValue ?? "")
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field && !field.includes("("));
}

function pickSelectedFields<T extends Record<string, unknown>>(row: T, selectValue: string | null) {
  const fields = selectedFields(selectValue);
  if (fields.length === 0) {
    return row;
  }

  return Object.fromEntries(
    fields.filter((field) => field in row).map((field) => [field, row[field]]),
  );
}

function sortRows<T extends Record<string, unknown>>(rows: T[], url: URL) {
  const orderParams = url.searchParams.getAll("order");
  if (orderParams.length === 0) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const orderParam of orderParams) {
      const [column, rawDirection = "asc"] = orderParam.split(".");
      const direction = rawDirection === "desc" ? "desc" : "asc";
      const comparison = compareFieldValues(left[column], right[column], direction);
      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });
}

function buildJsonResponseRows(
  request: IncomingMessage,
  rows: Record<string, unknown>[],
  status = 200,
) {
  const accept = request.headers.accept ?? "";
  if (accept.includes("application/vnd.pgrst.object+json")) {
    if (rows.length !== 1) {
      return {
        status: 406,
        body: { message: "JSON object requested, multiple (or no) rows returned" },
      };
    }

    return { status, body: rows[0] };
  }

  return { status, body: rows };
}

function shouldReturnRepresentation(request: IncomingMessage) {
  return (request.headers.prefer ?? "").includes("return=representation");
}

function createSessionResponse() {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRES_IN;

  return {
    access_token: ACCESS_TOKEN,
    token_type: "bearer",
    expires_in: TOKEN_EXPIRES_IN,
    expires_at: expiresAt,
    refresh_token: REFRESH_TOKEN,
    user: sessionUser,
  };
}

function buildContentRange(length: number) {
  return `0-${Math.max(length - 1, 0)}/${length}`;
}

function respondWithRows(
  req: IncomingMessage,
  res: ServerResponse,
  rows: Record<string, unknown>[],
  status = 200,
) {
  const response = buildJsonResponseRows(req, rows, status);
  json(res, response.status, response.body, {
    "content-range": buildContentRange(rows.length),
  });
}

function respondWithRepresentation(
  req: IncomingMessage,
  res: ServerResponse,
  rows: Record<string, unknown>[],
  created = false,
) {
  if (!shouldReturnRepresentation(req)) {
    noContent(res, created ? 201 : 204);
    return;
  }

  const response = buildJsonResponseRows(req, rows, created ? 201 : 200);
  json(res, response.status, response.body);
}

function materializeBacklogRows(url: URL) {
  return sortRows(
    Array.from(backlogItems.values())
      .filter((item) => item.user_id === TEST_USER_ID)
      .map((item) => ({
        id: item.id,
        status: item.status,
        display_title: item.display_title,
        primary_platform: item.primary_platform,
        note: item.note,
        sort_order: item.sort_order,
        created_at: item.created_at,
        works: works.get(item.work_id) ?? null,
      })),
    url,
  );
}

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
  return typeof target[key] === "string" ? (target[key] as string) : fallback;
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
  return typeof target[key] === "number" ? (target[key] as number) : null;
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

function buildWorkRow(row: Partial<Work>) {
  const id = row.id ?? `mock-work-${nextWorkId++}`;
  return createWork({
    id,
    created_by: row.created_by ?? TEST_USER_ID,
    source_type: row.source_type ?? "manual",
    work_type: row.work_type ?? "movie",
    tmdb_media_type: row.tmdb_media_type ?? null,
    tmdb_id: row.tmdb_id ?? null,
    parent_work_id: row.parent_work_id ?? null,
    title: row.title ?? "",
    original_title: row.original_title ?? null,
    search_text: row.search_text ?? createSearchText(row.title ?? ""),
    overview: row.overview ?? null,
    poster_path: row.poster_path ?? null,
    release_date: row.release_date ?? null,
    runtime_minutes: row.runtime_minutes ?? null,
    typical_episode_runtime_minutes: row.typical_episode_runtime_minutes ?? null,
    duration_bucket: row.duration_bucket ?? null,
    episode_count: row.episode_count ?? null,
    season_count: row.season_count ?? null,
    season_number: row.season_number ?? null,
    genres: row.genres ?? [],
    focus_required_score: row.focus_required_score ?? null,
    background_fit_score: row.background_fit_score ?? null,
    completion_load_score: row.completion_load_score ?? null,
    imdb_id: row.imdb_id ?? null,
    omdb_fetched_at: row.omdb_fetched_at ?? null,
    rotten_tomatoes_score: row.rotten_tomatoes_score ?? null,
    imdb_rating: row.imdb_rating ?? null,
    imdb_votes: row.imdb_votes ?? null,
    metacritic_score: row.metacritic_score ?? null,
    last_tmdb_synced_at: row.last_tmdb_synced_at ?? null,
    series_title: row.series_title ?? null,
  });
}

function buildBacklogItemRow(row: Partial<BacklogItem>) {
  return createBacklogItem({
    id: row.id ?? `mock-backlog-item-${nextBacklogItemId++}`,
    user_id: row.user_id ?? TEST_USER_ID,
    work_id: row.work_id ?? "work-manual-movie",
    status: row.status ?? "stacked",
    primary_platform: row.primary_platform ?? null,
    note: row.note ?? null,
    sort_order: row.sort_order ?? 1000,
    display_title: row.display_title ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
  });
}

function hasWorkConflict(row: Work) {
  return Array.from(works.values()).some(
    (work) =>
      work.created_by === row.created_by &&
      work.source_type === row.source_type &&
      work.work_type === row.work_type &&
      work.search_text === row.search_text,
  );
}

function findWork(url: URL) {
  return Array.from(works.values()).find((work) => matchesFilters(work, url));
}

function findBacklogItem(url: URL) {
  return Array.from(backlogItems.values()).find((item) => matchesFilters(item, url));
}

function upsertBacklogRows(rows: BacklogItem[]) {
  rows.forEach((row) => {
    const existing = Array.from(backlogItems.values()).find(
      (item) => item.user_id === row.user_id && item.work_id === row.work_id,
    );
    backlogItems.set(existing?.id ?? row.id, {
      ...existing,
      ...row,
      id: existing?.id ?? row.id,
      created_at: existing?.created_at ?? row.created_at,
    });
  });
}

async function handleAuth(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === "POST" && url.pathname === "/auth/v1/token") {
    const body = (await readJson(req)) as { email?: string; password?: string } | null;
    if (body?.email !== TEST_USER_EMAIL || body?.password !== TEST_USER_SECRET) {
      json(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
      return true;
    }

    json(res, 200, createSessionResponse());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/auth/v1/user") {
    json(res, 200, sessionUser);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/auth/v1/logout") {
    noContent(res);
    return true;
  }

  return false;
}

function handleGetBacklogItems(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "GET" || url.pathname !== "/rest/v1/backlog_items") {
    return false;
  }

  respondWithRows(req, res, materializeBacklogRows(url));
  return true;
}

function handleGetWorks(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "GET" || url.pathname !== "/rest/v1/works") {
    return false;
  }

  const rows = Array.from(works.values())
    .filter((work) => matchesFilters(work, url))
    .map((work) => pickSelectedFields(work, url.searchParams.get("select")));
  respondWithRows(req, res, rows);
  return true;
}

async function handlePostWorks(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "POST" || url.pathname !== "/rest/v1/works") {
    return false;
  }

  const payload = (await readJson(req)) as Partial<Work> | Array<Partial<Work>>;
  const rows = (Array.isArray(payload) ? payload : [payload]).map(buildWorkRow);

  if (!url.searchParams.get("on_conflict") && rows.some(hasWorkConflict)) {
    json(res, 409, { message: "duplicate key value", code: "23505" });
    return true;
  }

  rows.forEach((row) => {
    works.set(row.id, row);
  });

  respondWithRepresentation(
    req,
    res,
    rows.map((row) => pickSelectedFields(row, url.searchParams.get("select"))),
    true,
  );
  return true;
}

async function handlePatchWorks(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "PATCH" || url.pathname !== "/rest/v1/works") {
    return false;
  }

  const body = (await readJson(req)) as Partial<Work>;
  const target = findWork(url);
  if (!target) {
    json(res, 404, { message: "Work not found" });
    return true;
  }

  const updated = createWork({
    ...target,
    ...body,
    id: target.id,
    title: body.title ?? target.title,
  });
  works.set(updated.id, updated);
  respondWithRepresentation(req, res, [
    pickSelectedFields(updated, url.searchParams.get("select")),
  ]);
  return true;
}

async function handlePostBacklogItems(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "POST" || url.pathname !== "/rest/v1/backlog_items") {
    return false;
  }

  const payload = (await readJson(req)) as Partial<BacklogItem> | Array<Partial<BacklogItem>>;
  const rows = (Array.isArray(payload) ? payload : [payload]).map(buildBacklogItemRow);

  if (url.searchParams.get("on_conflict") === "user_id,work_id") {
    upsertBacklogRows(rows);
  } else {
    rows.forEach((row) => {
      backlogItems.set(row.id, row);
    });
  }

  respondWithRepresentation(req, res, rows, true);
  return true;
}

async function handlePatchBacklogItems(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "PATCH" || url.pathname !== "/rest/v1/backlog_items") {
    return false;
  }

  const body = (await readJson(req)) as Partial<BacklogItem>;
  const target = findBacklogItem(url);
  if (!target) {
    json(res, 404, { message: "Backlog item not found" });
    return true;
  }

  const updated = createBacklogItem({
    ...target,
    ...body,
    id: target.id,
    work_id: target.work_id,
    status: body.status ?? target.status,
    created_at: target.created_at,
  });
  backlogItems.set(updated.id, updated);
  respondWithRepresentation(req, res, [updated]);
  return true;
}

function handleDeleteBacklogItems(_req: IncomingMessage, res: ServerResponse, url: URL) {
  if (_req.method !== "DELETE" || url.pathname !== "/rest/v1/backlog_items") {
    return false;
  }

  const target = findBacklogItem(url);
  if (!target) {
    noContent(res);
    return true;
  }

  backlogItems.delete(target.id);
  noContent(res);
  return true;
}

async function handleRest(req: IncomingMessage, res: ServerResponse, url: URL) {
  const handlers: RouteHandler[] = [
    handleGetBacklogItems,
    handleGetWorks,
    handlePostWorks,
    handlePatchWorks,
    handlePostBacklogItems,
    handlePatchBacklogItems,
    handleDeleteBacklogItems,
  ];

  for (const handler of handlers) {
    if (await handler(req, res, url)) {
      return true;
    }
  }

  return false;
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

async function handleFunctions(req: IncomingMessage, res: ServerResponse, url: URL) {
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

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);

  if (req.method === "OPTIONS") {
    noContent(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (await handleAuth(req, res, url)) {
    return;
  }

  if (await handleRest(req, res, url)) {
    return;
  }

  if (await handleFunctions(req, res, url)) {
    return;
  }

  json(res, 404, { error: `Not found: ${req.method} ${url.pathname}` });
});

server.listen(PORT, HOST, () => {
  console.log(`Mock Supabase server listening on http://${HOST}:${PORT}`);
});
