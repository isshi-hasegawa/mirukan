import type { IncomingMessage, ServerResponse } from "node:http";
import { TEST_USER_ID } from "./constants.ts";
import { json, noContent, readJson } from "./http.ts";
import {
  matchesFilters,
  pickSelectedFields,
  respondWithRepresentation,
  respondWithRows,
  sortRows,
} from "./query.ts";
import {
  backlogItems,
  createBacklogItem,
  createSearchText,
  createWork,
  idCounters,
  works,
} from "./seed.ts";
import type { BacklogItem, RouteHandler, Work } from "./types.ts";

function buildWorkRow(row: Partial<Work>) {
  const id = row.id ?? `mock-work-${idCounters.nextWorkId++}`;
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
    id: row.id ?? `mock-backlog-item-${idCounters.nextBacklogItemId++}`,
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

function handleDeleteBacklogItems(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method !== "DELETE" || url.pathname !== "/rest/v1/backlog_items") {
    return false;
  }

  const target = findBacklogItem(url);
  if (target) {
    backlogItems.delete(target.id);
  }
  noContent(res);
  return true;
}

export async function handleRest(req: IncomingMessage, res: ServerResponse, url: URL) {
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
