import { http, HttpResponse } from "msw";
import type { BacklogItem, Work } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";
const IGNORED_FILTER_KEYS = ["select", "order", "limit", "offset", "columns", "on_conflict"];

const mockWorks = new Map<string, Work>();
const mockBacklogItems = new Map<string, BacklogItem>();
let nextWorkId = 1;
let nextBacklogItemId = 1;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function ensureWorkDefaults(work: Partial<Work>): Work {
  return {
    id: work.id ?? `mock-work-${nextWorkId++}`,
    created_by: work.created_by,
    source_type: work.source_type,
    work_type: work.work_type,
    search_text: work.search_text,
    tmdb_id: work.tmdb_id ?? null,
    tmdb_media_type: work.tmdb_media_type ?? null,
    title: work.title ?? "",
    original_title: work.original_title ?? null,
    overview: work.overview ?? null,
    poster_path: work.poster_path ?? null,
    release_date: work.release_date ?? null,
    parent_work_id: work.parent_work_id ?? null,
    runtime_minutes: work.runtime_minutes ?? null,
    typical_episode_runtime_minutes: work.typical_episode_runtime_minutes ?? null,
    duration_bucket: work.duration_bucket ?? null,
    genres: work.genres ?? [],
    imdb_id: work.imdb_id ?? null,
    season_count: work.season_count ?? null,
    season_number: work.season_number ?? null,
    episode_count: work.episode_count ?? null,
    focus_required_score: work.focus_required_score ?? null,
    background_fit_score: work.background_fit_score ?? null,
    completion_load_score: work.completion_load_score ?? null,
    last_tmdb_synced_at: work.last_tmdb_synced_at ?? null,
    omdb_fetched_at: work.omdb_fetched_at ?? null,
    rotten_tomatoes_score: work.rotten_tomatoes_score ?? null,
    imdb_rating: work.imdb_rating ?? null,
    imdb_votes: work.imdb_votes ?? null,
    metacritic_score: work.metacritic_score ?? null,
    series_title: work.series_title ?? null,
  };
}

function ensureBacklogItemDefaults(item: Partial<BacklogItem>): BacklogItem {
  return {
    id: item.id ?? `mock-backlog-item-${nextBacklogItemId++}`,
    user_id: item.user_id ?? "mock-user",
    work_id: item.work_id ?? "mock-work",
    status: item.status ?? "stacked",
    sort_order: item.sort_order ?? 1000,
    display_title: item.display_title ?? null,
    primary_platform: item.primary_platform ?? null,
    note: item.note ?? null,
  };
}

export function resetMockData() {
  mockWorks.clear();
  mockBacklogItems.clear();
  nextWorkId = 1;
  nextBacklogItemId = 1;
}

export function setMockWorks(works: Partial<Work>[]) {
  mockWorks.clear();
  works.map(ensureWorkDefaults).forEach((work) => {
    mockWorks.set(work.id, work);
  });
}

export function setMockBacklogItems(items: Partial<BacklogItem>[]) {
  mockBacklogItems.clear();
  items.map(ensureBacklogItemDefaults).forEach((item) => {
    mockBacklogItems.set(item.id, item);
  });
}

export function getMockWorks() {
  return Array.from(mockWorks.values()).map(clone);
}

export function getMockBacklogItems() {
  return Array.from(mockBacklogItems.values()).map(clone);
}

type ComparableValue = string | number | boolean | null | undefined;
type BacklogPayload = Partial<BacklogItem> | Array<Partial<BacklogItem>>;
type WorkPayload = Partial<Work> | Array<Partial<Work>>;

function isObjectResponse(request: Request) {
  return request.headers.get("accept")?.includes("application/vnd.pgrst.object+json") ?? false;
}

function buildJsonResponse<T extends Record<string, unknown>>(
  request: Request,
  rows: T[],
  status = 200,
) {
  if (isObjectResponse(request)) {
    if (rows.length !== 1) {
      return HttpResponse.json(
        { message: "JSON object requested, multiple (or no) rows returned" },
        { status: 406 },
      );
    }

    return HttpResponse.json(rows[0], { status });
  }

  return HttpResponse.json(rows, { status });
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

function matchesFilters<T extends Record<string, unknown>>(row: T, url: URL) {
  for (const [key, value] of url.searchParams.entries()) {
    if (IGNORED_FILTER_KEYS.includes(key)) {
      continue;
    }

    if (!value.startsWith("eq.")) {
      continue;
    }

    const expected = value.slice(3);
    const actual = row[key];
    if (String(actual) !== expected) {
      return false;
    }
  }

  return true;
}

function sortByOrderParams<T extends Record<string, unknown>>(rows: T[], url: URL) {
  const orderParams = url.searchParams.getAll("order");
  if (orderParams.length === 0) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const orderParam of orderParams) {
      const comparison = compareByOrderParam(left, right, orderParam);
      if (comparison !== 0) {
        return comparison;
      }
    }

    return 0;
  });
}

function compareByOrderParam<T extends Record<string, unknown>>(
  left: T,
  right: T,
  orderParam: string,
) {
  const [column, direction = "asc"] = orderParam.split(".");
  return compareOrderedValues(
    left[column] as ComparableValue,
    right[column] as ComparableValue,
    direction,
  );
}

function compareOrderedValues(
  leftValue: ComparableValue,
  rightValue: ComparableValue,
  direction: string,
) {
  if (leftValue === rightValue) {
    return 0;
  }

  if (leftValue === null || leftValue === undefined) {
    return direction === "desc" ? 1 : -1;
  }

  if (rightValue === null || rightValue === undefined) {
    return direction === "desc" ? -1 : 1;
  }

  if (leftValue < rightValue) {
    return direction === "desc" ? 1 : -1;
  }

  if (leftValue > rightValue) {
    return direction === "desc" ? -1 : 1;
  }

  return 0;
}

function materializeBacklogRows(url: URL) {
  return sortByOrderParams(Array.from(mockBacklogItems.values()), url).map((item) => ({
    ...item,
    works: mockWorks.get(item.work_id) ? clone(mockWorks.get(item.work_id)!) : null,
  }));
}

function shouldReturnRepresentation(request: Request) {
  return request.headers.get("prefer")?.includes("return=representation") ?? false;
}

function jsonNoContent(status = 201) {
  return new HttpResponse(null, { status });
}

function createRows<T>(payload: T | T[], ensureDefaults: (value: T) => T) {
  return (Array.isArray(payload) ? payload : [payload]).map(ensureDefaults);
}

function upsertBacklogRows(rows: BacklogItem[], url: URL) {
  if (url.searchParams.get("on_conflict") !== "user_id,work_id") {
    rows.forEach((row) => {
      mockBacklogItems.set(row.id, row);
    });
    return;
  }

  rows.forEach((row) => {
    const existing = Array.from(mockBacklogItems.values()).find(
      (item) => item.user_id === row.user_id && item.work_id === row.work_id,
    );
    const merged = ensureBacklogItemDefaults({
      ...existing,
      ...row,
      id: existing?.id ?? row.id,
    });
    mockBacklogItems.set(merged.id, merged);
  });
}

function hasWorkConflict(rows: Work[]) {
  return rows.some((row) =>
    Array.from(mockWorks.values()).some(
      (work) =>
        work.created_by === row.created_by &&
        work.source_type === row.source_type &&
        work.work_type === row.work_type &&
        work.search_text === row.search_text,
    ),
  );
}

function upsertWorks(rows: Work[], url: URL) {
  if (!url.searchParams.get("on_conflict") && hasWorkConflict(rows)) {
    return HttpResponse.json({ message: "duplicate key value", code: "23505" }, { status: 409 });
  }

  rows.forEach((row) => {
    mockWorks.set(row.id, row);
  });

  return null;
}

function patchStoredRow<T extends Record<string, unknown>>(
  store: Map<string, T>,
  url: URL,
  body: Partial<T>,
  notFoundMessage: string,
  ensureDefaults: (value: Partial<T>) => T,
) {
  const target = Array.from(store.values()).find((row) => matchesFilters(row, url));
  if (!target) {
    return HttpResponse.json({ message: notFoundMessage }, { status: 404 });
  }

  const updated = ensureDefaults({ ...target, ...body });
  store.set(String(updated.id), updated);
  return updated;
}

export const supabaseRestHandlers = [
  http.get(`${SUPABASE_URL}/rest/v1/backlog_items`, ({ request }) => {
    const url = new URL(request.url);
    const rows = materializeBacklogRows(url);
    return buildJsonResponse(request, rows);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/works`, ({ request }) => {
    const url = new URL(request.url);
    const rows = Array.from(mockWorks.values())
      .filter((work) => matchesFilters(work, url))
      .map((work) => pickSelectedFields(work, url.searchParams.get("select")));

    return buildJsonResponse(request, rows);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/backlog_items`, async ({ request }) => {
    const url = new URL(request.url);
    const payload = (await request.json()) as BacklogPayload;
    const rows = createRows(payload, ensureBacklogItemDefaults);
    upsertBacklogRows(rows, url);

    if (!shouldReturnRepresentation(request)) {
      return jsonNoContent();
    }

    return buildJsonResponse(request, rows, 201);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/works`, async ({ request }) => {
    const url = new URL(request.url);
    const payload = (await request.json()) as WorkPayload;
    const rows = createRows(payload, ensureWorkDefaults);
    const conflictResponse = upsertWorks(rows, url);
    if (conflictResponse) {
      return conflictResponse;
    }

    if (!shouldReturnRepresentation(request)) {
      return jsonNoContent();
    }

    const selected = rows.map((row) => pickSelectedFields(row, url.searchParams.get("select")));
    return buildJsonResponse(request, selected, 201);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/works`, async ({ request }) => {
    const url = new URL(request.url);
    const body = (await request.json()) as Partial<Work>;
    const updated = patchStoredRow(mockWorks, url, body, "Work not found", ensureWorkDefaults);
    if (updated instanceof HttpResponse) {
      return updated;
    }

    if (!shouldReturnRepresentation(request)) {
      return new HttpResponse(null, { status: 204 });
    }

    return buildJsonResponse(request, [
      pickSelectedFields(updated, url.searchParams.get("select")),
    ]);
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/backlog_items`, async ({ request }) => {
    const url = new URL(request.url);
    const body = (await request.json()) as Partial<BacklogItem>;
    const updated = patchStoredRow(
      mockBacklogItems,
      url,
      body,
      "Backlog item not found",
      ensureBacklogItemDefaults,
    );
    if (updated instanceof HttpResponse) {
      return updated;
    }

    if (!shouldReturnRepresentation(request)) {
      return new HttpResponse(null, { status: 204 });
    }

    return buildJsonResponse(request, [updated]);
  }),
];
