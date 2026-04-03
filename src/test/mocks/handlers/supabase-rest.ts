import { http, HttpResponse } from "msw";
import type { BacklogItem, PostgrestResponse, Work } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

/**
 * MSW handlers for Supabase PostgREST API
 * These intercept REST API calls to Supabase database
 */

// Mock data storage for test state management
let mockWorks: Map<string, Work> = new Map();
let mockBacklogItems: Map<string, BacklogItem> = new Map();

export function resetMockData() {
  mockWorks.clear();
  mockBacklogItems.clear();
}

function setMockWorks(works: Work[]) {
  mockWorks.clear();
  works.forEach((work) => mockWorks.set(work.id, work));
}

function setMockBacklogItems(items: BacklogItem[]) {
  mockBacklogItems.clear();
  items.forEach((item) => mockBacklogItems.set(item.id, item));
}

export const supabaseRestHandlers = [
  /**
   * GET /rest/v1/backlog_items
   * Retrieve backlog items (with optional filtering)
   */
  http.get(`${SUPABASE_URL}/rest/v1/backlog_items`, ({ request }) => {
    const url = new URL(request.url);
    const order = url.searchParams.get("order");

    const items = Array.from(mockBacklogItems.values());

    // Simple ordering support
    if (order?.includes("sort_order")) {
      items.sort((a, b) => {
        if (order.includes("desc")) {
          return b.sort_order - a.sort_order;
        }
        return a.sort_order - b.sort_order;
      });
    }

    return HttpResponse.json<PostgrestResponse<BacklogItem>>({
      data: items,
      error: null,
    });
  }),

  /**
   * GET /rest/v1/works
   * Retrieve works with optional filtering
   */
  http.get(`${SUPABASE_URL}/rest/v1/works`, () => {
    const works = Array.from(mockWorks.values());

    return HttpResponse.json<PostgrestResponse<Work>>({
      data: works,
      error: null,
    });
  }),

  /**
   * POST /rest/v1/backlog_items
   * Create a new backlog item
   */
  http.post(`${SUPABASE_URL}/rest/v1/backlog_items`, async ({ request }) => {
    const body = (await request.json()) as Partial<BacklogItem>;

    const newItem: BacklogItem = {
      id: `mock-${Date.now()}`,
      user_id: body.user_id || "mock-user",
      work_id: body.work_id || "mock-work",
      status: body.status || "stacked",
      sort_order: body.sort_order || 1000,
      display_title: body.display_title || "",
      primary_platform: body.primary_platform || null,
      note: body.note || null,
    };

    mockBacklogItems.set(newItem.id, newItem);

    return HttpResponse.json<PostgrestResponse<BacklogItem>>({
      data: [newItem],
      error: null,
    });
  }),

  /**
   * POST /rest/v1/works
   * Create a new work
   */
  http.post(`${SUPABASE_URL}/rest/v1/works`, async ({ request }) => {
    const body = (await request.json()) as Partial<Work>;

    const newWork: Work = {
      id: `mock-work-${Date.now()}`,
      tmdb_id: body.tmdb_id || null,
      tmdb_media_type: body.tmdb_media_type || null,
      title: body.title || "",
      original_title: body.original_title || null,
      overview: body.overview || null,
      poster_path: body.poster_path || null,
      release_date: body.release_date || null,
      season_number: body.season_number || null,
      episode_count: body.episode_count || null,
      series_title: body.series_title || null,
    };

    mockWorks.set(newWork.id, newWork);

    return HttpResponse.json<PostgrestResponse<Work>>({
      data: [newWork],
      error: null,
    });
  }),

  /**
   * PATCH /rest/v1/backlog_items
   * Update backlog item by ID
   */
  http.patch(`${SUPABASE_URL}/rest/v1/backlog_items`, async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const body = (await request.json()) as Partial<BacklogItem>;

    if (!id) {
      return HttpResponse.json<PostgrestResponse<BacklogItem>>(
        {
          data: null,
          error: { message: "Missing id filter" },
        },
        { status: 400 },
      );
    }

    const existing = mockBacklogItems.get(id);
    if (!existing) {
      return HttpResponse.json<PostgrestResponse<BacklogItem>>(
        {
          data: null,
          error: { message: `Item ${id} not found` },
        },
        { status: 404 },
      );
    }

    const updated: BacklogItem = { ...existing, ...body };
    mockBacklogItems.set(id, updated);

    return HttpResponse.json<PostgrestResponse<BacklogItem>>({
      data: [updated],
      error: null,
    });
  }),

  /**
   * PATCH /rest/v1/works
   * Update work by ID
   */
  http.patch(`${SUPABASE_URL}/rest/v1/works`, async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const body = (await request.json()) as Partial<Work>;

    if (!id) {
      return HttpResponse.json<PostgrestResponse<Work>>(
        {
          data: null,
          error: { message: "Missing id filter" },
        },
        { status: 400 },
      );
    }

    const existing = mockWorks.get(id);
    if (!existing) {
      return HttpResponse.json<PostgrestResponse<Work>>(
        {
          data: null,
          error: { message: `Work ${id} not found` },
        },
        { status: 404 },
      );
    }

    const updated: Work = { ...existing, ...body };
    mockWorks.set(id, updated);

    return HttpResponse.json<PostgrestResponse<Work>>({
      data: [updated],
      error: null,
    });
  }),

  /**
   * UPSERT /rest/v1/backlog_items
   * Insert or update backlog items
   */
  http.post(`${SUPABASE_URL}/rest/v1/backlog_items`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("on_conflict") !== "id") {
      return;
    }

    const body = (await request.json()) as BacklogItem | BacklogItem[];
    const items = Array.isArray(body) ? body : [body];

    items.forEach((item) => {
      const existing = mockBacklogItems.get(item.id);
      const toStore = existing ? { ...existing, ...item } : item;
      mockBacklogItems.set(item.id, toStore);
    });

    return HttpResponse.json<PostgrestResponse<BacklogItem>>({
      data: items,
      error: null,
    });
  }),

  /**
   * UPSERT /rest/v1/works
   * Insert or update works
   */
  http.post(`${SUPABASE_URL}/rest/v1/works`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("on_conflict") !== "id") {
      return;
    }

    const body = (await request.json()) as Work | Work[];
    const works = Array.isArray(body) ? body : [body];

    works.forEach((work) => {
      const existing = mockWorks.get(work.id);
      const toStore = existing ? { ...existing, ...work } : work;
      mockWorks.set(work.id, toStore);
    });

    return HttpResponse.json<PostgrestResponse<Work>>({
      data: works,
      error: null,
    });
  }),

  /**
   * DELETE /rest/v1/backlog_items
   * Delete backlog item by ID
   */
  http.delete(`${SUPABASE_URL}/rest/v1/backlog_items`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return HttpResponse.json<PostgrestResponse<BacklogItem>>(
        {
          data: null,
          error: { message: "Missing id filter" },
        },
        { status: 400 },
      );
    }

    const existing = mockBacklogItems.get(id);
    if (!existing) {
      return HttpResponse.json<PostgrestResponse<BacklogItem>>(
        {
          data: null,
          error: { message: `Item ${id} not found` },
        },
        { status: 404 },
      );
    }

    mockBacklogItems.delete(id);

    return HttpResponse.json<PostgrestResponse<BacklogItem>>({
      data: [existing],
      error: null,
    });
  }),
];
