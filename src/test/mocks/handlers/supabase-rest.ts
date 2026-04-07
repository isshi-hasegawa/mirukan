import { http, HttpResponse } from "msw";
import type { BacklogItem, Work } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

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
    season_count: work.season_count ?? null,
    season_number: work.season_number ?? null,
    episode_count: work.episode_count ?? null,
    focus_required_score: work.focus_required_score ?? null,
    background_fit_score: work.background_fit_score ?? null,
    completion_load_score: work.completion_load_score ?? null,
    last_tmdb_synced_at: work.last_tmdb_synced_at ?? null,
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
    display_title: item.display_title ?? "",
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

function isObjectResponse(request: Request) {
  return request.headers.get("accept")?.includes("application/vnd.pgrst.object+json") ?? false;
}

function buildJsonResponse(request: Request, rows: unknown[], status = 200) {
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
    if (["select", "order", "limit", "offset", "columns", "on_conflict"].includes(key)) {
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
    const payload = (await request.json()) as Partial<BacklogItem> | Array<Partial<BacklogItem>>;
    const rows = (Array.isArray(payload) ? payload : [payload]).map(ensureBacklogItemDefaults);

    if (url.searchParams.get("on_conflict") === "user_id,work_id") {
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
    } else {
      rows.forEach((row) => {
        mockBacklogItems.set(row.id, row);
      });
    }

    if (!shouldReturnRepresentation(request)) {
      return jsonNoContent();
    }

    return buildJsonResponse(request, rows, 201);
  }),

  http.post(`${SUPABASE_URL}/rest/v1/works`, async ({ request }) => {
    const url = new URL(request.url);
    const payload = (await request.json()) as Partial<Work> | Array<Partial<Work>>;
    const rows = (Array.isArray(payload) ? payload : [payload]).map(ensureWorkDefaults);

    if (url.searchParams.get("on_conflict")) {
      rows.forEach((row) => {
        mockWorks.set(row.id, row);
      });
    } else {
      const hasConflict = rows.some((row) =>
        Array.from(mockWorks.values()).some(
          (work) =>
            work.created_by === row.created_by &&
            work.source_type === row.source_type &&
            work.work_type === row.work_type &&
            work.search_text === row.search_text,
        ),
      );

      if (hasConflict) {
        return HttpResponse.json(
          { message: "duplicate key value", code: "23505" },
          { status: 409 },
        );
      }

      rows.forEach((row) => {
        mockWorks.set(row.id, row);
      });
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
    const target = Array.from(mockWorks.values()).find((work) => matchesFilters(work, url));

    if (!target) {
      return HttpResponse.json({ message: "Work not found" }, { status: 404 });
    }

    const updated = ensureWorkDefaults({ ...target, ...body });
    mockWorks.set(updated.id, updated);

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
    const target = Array.from(mockBacklogItems.values()).find((item) => matchesFilters(item, url));

    if (!target) {
      return HttpResponse.json({ message: "Backlog item not found" }, { status: 404 });
    }

    const updated = ensureBacklogItemDefaults({ ...target, ...body });
    mockBacklogItems.set(updated.id, updated);

    if (!shouldReturnRepresentation(request)) {
      return new HttpResponse(null, { status: 204 });
    }

    return buildJsonResponse(request, [updated]);
  }),
];
