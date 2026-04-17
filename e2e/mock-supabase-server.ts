import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const HOST = "127.0.0.1";
const PORT = Number(process.env.MOCK_SUPABASE_PORT || "55432");
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "password123";
const TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const ACCESS_TOKEN = "mock-access-token";
const REFRESH_TOKEN = "mock-refresh-token";
const TOKEN_EXPIRES_IN = 60 * 60;

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

const works = new Map<string, Work>([
  [
    "work-manual-movie",
    {
      id: "work-manual-movie",
      created_by: TEST_USER_ID,
      source_type: "manual",
      tmdb_media_type: null,
      tmdb_id: null,
      work_type: "movie",
      parent_work_id: null,
      title: "遠い街の休日",
      original_title: null,
      search_text: "遠い街の休日",
      overview: "配信では見つからなかったので手動で積んだ、しっとり系のヒューマンドラマ。",
      poster_path: null,
      release_date: "2018-04-13",
      runtime_minutes: 95,
      typical_episode_runtime_minutes: null,
      duration_bucket: "long",
      episode_count: null,
      season_count: null,
      season_number: null,
      genres: ["Drama", "Family"],
      focus_required_score: 50,
      background_fit_score: 25,
      completion_load_score: 25,
      imdb_id: null,
      omdb_fetched_at: null,
      rotten_tomatoes_score: null,
      imdb_rating: null,
      imdb_votes: null,
      metacritic_score: null,
      last_tmdb_synced_at: null,
      series_title: null,
    },
  ],
  [
    "work-manual-series",
    {
      id: "work-manual-series",
      created_by: TEST_USER_ID,
      source_type: "manual",
      tmdb_media_type: null,
      tmdb_id: null,
      work_type: "series",
      parent_work_id: null,
      title: "週末メモリーズ",
      original_title: null,
      search_text: "週末メモリーズ",
      overview: "あとで配信先を調べたい、雑談向きの軽めシリーズ。",
      poster_path: null,
      release_date: "2021-10-08",
      runtime_minutes: null,
      typical_episode_runtime_minutes: 24,
      duration_bucket: "short",
      episode_count: null,
      season_count: 10,
      season_number: null,
      genres: ["Comedy"],
      focus_required_score: 25,
      background_fit_score: 75,
      completion_load_score: 25,
      imdb_id: null,
      omdb_fetched_at: null,
      rotten_tomatoes_score: null,
      imdb_rating: null,
      imdb_votes: null,
      metacritic_score: null,
      last_tmdb_synced_at: null,
      series_title: null,
    },
  ],
  [
    "work-breaking-bad",
    {
      id: "work-breaking-bad",
      created_by: TEST_USER_ID,
      source_type: "tmdb",
      tmdb_media_type: "tv",
      tmdb_id: 1396,
      work_type: "series",
      parent_work_id: null,
      title: "ブレイキング・バッド",
      original_title: "Breaking Bad",
      search_text: "ブレイキング・バッド breaking bad",
      overview:
        "A high school chemistry teacher turned meth producer navigates danger, pride, and family collapse.",
      poster_path: "/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg",
      release_date: "2008-01-20",
      runtime_minutes: null,
      typical_episode_runtime_minutes: 47,
      duration_bucket: "medium",
      episode_count: null,
      season_count: 5,
      season_number: null,
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
      series_title: null,
    },
  ],
  [
    "work-breaking-bad-season2",
    {
      id: "work-breaking-bad-season2",
      created_by: TEST_USER_ID,
      source_type: "tmdb",
      tmdb_media_type: "tv",
      tmdb_id: 1396,
      work_type: "season",
      parent_work_id: "work-breaking-bad",
      title: "ブレイキング・バッド シーズン2",
      original_title: "Breaking Bad Season 2",
      search_text: "ブレイキング・バッド season 2",
      overview: "ウォルターとジェシーの選択がさらに重くなっていく第二シーズン。",
      poster_path: "/eSzpy96DwBujGFj0xMbXBcGcfxX.jpg",
      release_date: "2009-03-08",
      runtime_minutes: null,
      typical_episode_runtime_minutes: 47,
      duration_bucket: "medium",
      episode_count: 13,
      season_count: null,
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
    },
  ],
  [
    "work-matrix",
    {
      id: "work-matrix",
      created_by: TEST_USER_ID,
      source_type: "tmdb",
      tmdb_media_type: "movie",
      tmdb_id: 603,
      work_type: "movie",
      parent_work_id: null,
      title: "マトリックス",
      original_title: "The Matrix",
      search_text: "マトリックス the matrix",
      overview:
        "A computer hacker learns about the true nature of reality and his role in the war against its controllers.",
      poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
      release_date: "1999-03-31",
      runtime_minutes: 136,
      typical_episode_runtime_minutes: null,
      duration_bucket: "very_long",
      episode_count: null,
      season_count: null,
      season_number: null,
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
      series_title: null,
    },
  ],
]);

const backlogItems = new Map<string, BacklogItem>([
  [
    "backlog-stacked",
    {
      id: "backlog-stacked",
      user_id: TEST_USER_ID,
      work_id: "work-manual-movie",
      status: "stacked",
      primary_platform: null,
      note: "配信先不明。週末に腰を据えて観たい。",
      sort_order: 1000,
      display_title: null,
      created_at: "2026-04-10T00:00:00.000Z",
    },
  ],
  [
    "backlog-want",
    {
      id: "backlog-want",
      user_id: TEST_USER_ID,
      work_id: "work-manual-series",
      status: "want_to_watch",
      primary_platform: null,
      note: "軽い気分の日に候補へ回しておく。",
      sort_order: 1000,
      display_title: null,
      created_at: "2026-04-11T00:00:00.000Z",
    },
  ],
  [
    "backlog-watching",
    {
      id: "backlog-watching",
      user_id: TEST_USER_ID,
      work_id: "work-breaking-bad",
      status: "watching",
      primary_platform: "netflix",
      note: "今月の平日夜に少しずつ進める。",
      sort_order: 1000,
      display_title: null,
      created_at: "2026-04-12T00:00:00.000Z",
    },
  ],
  [
    "backlog-interrupted",
    {
      id: "backlog-interrupted",
      user_id: TEST_USER_ID,
      work_id: "work-breaking-bad-season2",
      status: "interrupted",
      primary_platform: "netflix",
      note: "再開ポイント確認待ち。",
      sort_order: 1000,
      display_title: null,
      created_at: "2026-04-13T00:00:00.000Z",
    },
  ],
  [
    "backlog-watched",
    {
      id: "backlog-watched",
      user_id: TEST_USER_ID,
      work_id: "work-matrix",
      status: "watched",
      primary_platform: "prime_video",
      note: "視聴済みだけど比較用に残しているカード。",
      sort_order: 1000,
      display_title: null,
      created_at: "2026-04-14T00:00:00.000Z",
    },
  ],
]);

let nextWorkId = 1;
let nextBacklogItemId = 1;

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
      const [column, direction = "asc"] = orderParam.split(".");
      const leftValue = left[column];
      const rightValue = right[column];
      if (leftValue === rightValue) {
        continue;
      }

      if (leftValue === null || leftValue === undefined) return direction === "desc" ? 1 : -1;
      if (rightValue === null || rightValue === undefined) return direction === "desc" ? -1 : 1;
      if (leftValue < rightValue) return direction === "desc" ? 1 : -1;
      if (leftValue > rightValue) return direction === "desc" ? -1 : 1;
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

function createSearchText(title: string) {
  return title.trim().toLowerCase();
}

function createTmdbWorkDetails(target: Record<string, unknown>) {
  const workType =
    target.workType === "season" ? "season" : target.workType === "series" ? "series" : "movie";
  const releaseDate = typeof target.releaseDate === "string" ? target.releaseDate : "2025-02-02";
  const title = typeof target.title === "string" ? target.title : "テスト作品";
  const originalTitle =
    typeof target.originalTitle === "string" || target.originalTitle === null
      ? target.originalTitle
      : "Test Work";

  return {
    tmdbId: typeof target.tmdbId === "number" ? target.tmdbId : 777002,
    tmdbMediaType: target.tmdbMediaType === "tv" ? "tv" : "movie",
    workType,
    title,
    originalTitle,
    overview:
      typeof target.overview === "string" || target.overview === null
        ? target.overview
        : "overview",
    posterPath:
      typeof target.posterPath === "string" || target.posterPath === null
        ? target.posterPath
        : null,
    releaseDate,
    genres: workType === "movie" ? ["Drama"] : ["Drama", "Crime"],
    runtimeMinutes: workType === "movie" ? 110 : null,
    typicalEpisodeRuntimeMinutes: workType === "movie" ? null : 47,
    episodeCount: typeof target.episodeCount === "number" ? target.episodeCount : null,
    seasonCount: workType === "series" ? 3 : null,
    seasonNumber: typeof target.seasonNumber === "number" ? target.seasonNumber : null,
    imdbId: "tt7654321",
  };
}

async function handleAuth(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === "POST" && url.pathname === "/auth/v1/token") {
    const body = (await readJson(req)) as { email?: string; password?: string } | null;
    if (body?.email !== TEST_USER_EMAIL || body?.password !== TEST_USER_PASSWORD) {
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

async function handleRest(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === "GET" && url.pathname === "/rest/v1/backlog_items") {
    const rows = materializeBacklogRows(url);
    const response = buildJsonResponseRows(req, rows);
    json(res, response.status, response.body, {
      "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}`,
    });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/rest/v1/works") {
    const rows = Array.from(works.values())
      .filter((work) => matchesFilters(work, url))
      .map((work) => pickSelectedFields(work, url.searchParams.get("select")));
    const response = buildJsonResponseRows(req, rows);
    json(res, response.status, response.body, {
      "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}`,
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/rest/v1/works") {
    const payload = (await readJson(req)) as Partial<Work> | Array<Partial<Work>>;
    const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => {
      const id = row.id ?? `mock-work-${nextWorkId++}`;
      const createdBy = row.created_by ?? TEST_USER_ID;
      return {
        id,
        created_by: createdBy,
        source_type: row.source_type ?? "manual",
        tmdb_media_type: row.tmdb_media_type ?? null,
        tmdb_id: row.tmdb_id ?? null,
        work_type: row.work_type ?? "movie",
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
      } satisfies Work;
    });

    const hasConflict = rows.some((row) =>
      Array.from(works.values()).some(
        (work) =>
          work.created_by === row.created_by &&
          work.source_type === row.source_type &&
          work.work_type === row.work_type &&
          work.search_text === row.search_text,
      ),
    );

    if (!url.searchParams.get("on_conflict") && hasConflict) {
      json(res, 409, { message: "duplicate key value", code: "23505" });
      return true;
    }

    rows.forEach((row) => {
      works.set(row.id, row);
    });

    if (!shouldReturnRepresentation(req)) {
      noContent(res, 201);
      return true;
    }

    const response = buildJsonResponseRows(
      req,
      rows.map((row) => pickSelectedFields(row, url.searchParams.get("select"))),
      201,
    );
    json(res, response.status, response.body);
    return true;
  }

  if (req.method === "PATCH" && url.pathname === "/rest/v1/works") {
    const body = (await readJson(req)) as Partial<Work>;
    const target = Array.from(works.values()).find((work) => matchesFilters(work, url));

    if (!target) {
      json(res, 404, { message: "Work not found" });
      return true;
    }

    const updated = { ...target, ...body };
    works.set(updated.id, updated);

    if (!shouldReturnRepresentation(req)) {
      noContent(res);
      return true;
    }

    json(res, 200, [pickSelectedFields(updated, url.searchParams.get("select"))]);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/rest/v1/backlog_items") {
    const payload = (await readJson(req)) as Partial<BacklogItem> | Array<Partial<BacklogItem>>;
    const rows = (Array.isArray(payload) ? payload : [payload]).map(
      (row) =>
        ({
          id: row.id ?? `mock-backlog-item-${nextBacklogItemId++}`,
          user_id: row.user_id ?? TEST_USER_ID,
          work_id: row.work_id ?? "work-manual-movie",
          status: row.status ?? "stacked",
          primary_platform: row.primary_platform ?? null,
          note: row.note ?? null,
          sort_order: row.sort_order ?? 1000,
          display_title: row.display_title ?? null,
          created_at: row.created_at ?? new Date().toISOString(),
        }) satisfies BacklogItem,
    );

    if (url.searchParams.get("on_conflict") === "user_id,work_id") {
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
    } else {
      rows.forEach((row) => {
        backlogItems.set(row.id, row);
      });
    }

    if (!shouldReturnRepresentation(req)) {
      noContent(res, 201);
      return true;
    }

    const response = buildJsonResponseRows(req, rows, 201);
    json(res, response.status, response.body);
    return true;
  }

  if (req.method === "PATCH" && url.pathname === "/rest/v1/backlog_items") {
    const body = (await readJson(req)) as Partial<BacklogItem>;
    const target = Array.from(backlogItems.values()).find((item) => matchesFilters(item, url));

    if (!target) {
      json(res, 404, { message: "Backlog item not found" });
      return true;
    }

    const updated = { ...target, ...body };
    backlogItems.set(updated.id, updated);

    if (!shouldReturnRepresentation(req)) {
      noContent(res);
      return true;
    }

    json(res, 200, [updated]);
    return true;
  }

  if (req.method === "DELETE" && url.pathname === "/rest/v1/backlog_items") {
    const target = Array.from(backlogItems.values()).find((item) => matchesFilters(item, url));

    if (!target) {
      noContent(res);
      return true;
    }

    backlogItems.delete(target.id);
    noContent(res);
    return true;
  }

  return false;
}

async function handleFunctions(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "POST" || !url.pathname.startsWith("/functions/v1/")) {
    return false;
  }

  const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;
  const functionName = url.pathname.replace("/functions/v1/", "");

  if (functionName === "fetch-tmdb-trending") {
    json(res, 200, [
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
    ]);
    return true;
  }

  if (functionName === "fetch-tmdb-similar") {
    json(res, 200, []);
    return true;
  }

  if (functionName === "search-tmdb-works") {
    const query = typeof body.query === "string" ? body.query.trim() : "";
    json(
      res,
      200,
      query
        ? [
            {
              tmdbId: 777002,
              tmdbMediaType: "movie",
              workType: "movie",
              title: `検索結果 ${query}`.trim(),
              originalTitle: "Search Result",
              overview: "search result overview",
              posterPath: null,
              releaseDate: "2025-02-02",
              jpWatchPlatforms: [],
              hasJapaneseRelease: true,
            },
          ]
        : [],
    );
    return true;
  }

  if (functionName === "fetch-tmdb-season-options") {
    json(res, 200, []);
    return true;
  }

  if (functionName === "fetch-tmdb-work-details") {
    json(res, 200, createTmdbWorkDetails((body.target as Record<string, unknown>) ?? {}));
    return true;
  }

  if (functionName === "suggest-display-title") {
    json(res, 200, { title: null });
    return true;
  }

  if (functionName === "fetch-omdb-work-details") {
    json(res, 200, {
      rottenTomatoesScore: 96,
      imdbRating: 9.5,
      imdbVotes: 2300000,
      metacriticScore: 87,
    });
    return true;
  }

  json(res, 404, { error: `Unknown function: ${functionName}` });
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
