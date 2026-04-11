import { http, HttpResponse } from "msw";
import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../test/backlog-fixtures.ts";
import { getMockBacklogItems, setMockBacklogItems } from "../../test/mocks/handlers";
import { server } from "../../test/mocks/server";
import {
  BACKLOG_ITEM_SELECT,
  fetchBacklogItems,
  updateBacklogItem,
  upsertBacklogItemsToStatus,
} from "./backlog-repository.ts";
import type { BacklogItem } from "./types.ts";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

setupTestLifecycle();

function normalizeSelect(value: string) {
  return value.replaceAll(/\s+/g, "");
}

function normalizeOrder(values: string[]) {
  return values.flatMap((value) => value.split(","));
}

function createItem(
  id: string,
  status: BacklogItem["status"],
  sortOrder: number,
  workId = `work-${id}`,
): BacklogItem {
  return {
    id,
    status,
    primary_platform: null,
    note: null,
    sort_order: sortOrder,
    works: createWorkSummary({
      id: workId,
      title: `Title ${id}`,
      source_type: "manual",
      tmdb_id: null,
      tmdb_media_type: null,
    }),
  };
}

describe("fetchBacklogItems", () => {
  test("query 定義を repository に集約し、works を正規化して返す", async () => {
    let receivedSelect = "";
    let receivedOrder: string[] = [];
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/backlog_items`, ({ request }) => {
        const url = new URL(request.url);
        receivedSelect = url.searchParams.get("select") ?? "";
        receivedOrder = url.searchParams.getAll("order");

        return HttpResponse.json([
          {
            id: "item-1",
            status: "stacked",
            primary_platform: null,
            note: null,
            sort_order: 1000,
            works: [
              {
                id: "work-1",
                title: "作品1",
                work_type: "movie",
                source_type: "tmdb",
                tmdb_id: 1,
                tmdb_media_type: "movie",
                original_title: null,
                overview: null,
                poster_path: null,
                release_date: null,
                runtime_minutes: null,
                typical_episode_runtime_minutes: null,
                duration_bucket: null,
                genres: [],
                season_count: null,
                season_number: null,
                focus_required_score: null,
                background_fit_score: null,
                completion_load_score: null,
                rotten_tomatoes_score: null,
                imdb_rating: null,
                imdb_votes: null,
                metacritic_score: null,
              },
            ],
          },
        ]);
      }),
    );

    const result = await fetchBacklogItems();

    expect(normalizeSelect(receivedSelect)).toBe(normalizeSelect(BACKLOG_ITEM_SELECT));
    expect(normalizeOrder(receivedOrder)).toEqual(["sort_order.asc", "created_at.asc"]);
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: "item-1",
          works: expect.objectContaining({ id: "work-1", title: "作品1" }),
        }),
      ],
      error: null,
    });
  });

  test("取得失敗時は空配列と error を返す", async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/backlog_items`, () => {
        return HttpResponse.json({ message: "network failed" }, { status: 500 });
      }),
    );

    await expect(fetchBacklogItems()).resolves.toEqual({
      data: [],
      error: "network failed",
    });
  });
});

describe("upsertBacklogItemsToStatus", () => {
  test("空入力または action なしなら no-op", async () => {
    setMockBacklogItems([
      {
        id: "existing",
        user_id: "user-1",
        work_id: "work-1",
        status: "stacked",
        sort_order: 1000,
      },
    ]);

    await expect(
      upsertBacklogItemsToStatus("user-1", [], [], "stacked", {
        note: null,
        primary_platform: null,
      }),
    ).resolves.toEqual({ error: null });

    await expect(
      upsertBacklogItemsToStatus(
        "user-1",
        [createItem("a", "stacked", 1000, "work-1")],
        ["work-1"],
        "stacked",
        {
          note: "ignored",
          primary_platform: "netflix",
        },
      ),
    ).resolves.toEqual({ error: null });

    expect(getMockBacklogItems()).toHaveLength(1);
  });

  test("insert と move が混在しても先頭側から sort_order を振る", async () => {
    setMockBacklogItems([
      {
        id: "existing-top",
        user_id: "user-1",
        work_id: "work-top",
        status: "stacked",
        sort_order: 3000,
      },
      {
        id: "move-me",
        user_id: "user-1",
        work_id: "work-move",
        status: "watching",
        sort_order: 1000,
      },
    ]);

    await expect(
      upsertBacklogItemsToStatus(
        "user-1",
        [
          createItem("existing-top", "stacked", 3000, "work-top"),
          createItem("move-me", "watching", 1000, "work-move"),
        ],
        ["work-move", "work-new"],
        "stacked",
        {
          note: "新規メモ",
          primary_platform: "netflix",
        },
      ),
    ).resolves.toEqual({ error: null });

    expect(
      getMockBacklogItems()
        .filter((item) => item.status === "stacked")
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => ({
          work_id: item.work_id,
          primary_platform: item.primary_platform,
          note: item.note,
          sort_order: item.sort_order,
        })),
    ).toEqual([
      {
        work_id: "work-move",
        primary_platform: null,
        note: null,
        sort_order: 1000,
      },
      {
        work_id: "work-new",
        primary_platform: "netflix",
        note: "新規メモ",
        sort_order: 2000,
      },
      {
        work_id: "work-top",
        primary_platform: null,
        note: null,
        sort_order: 3000,
      },
    ]);
  });

  test("upsert 失敗時はエラーを返す", async () => {
    server.use(
      http.post(`${SUPABASE_URL}/rest/v1/backlog_items`, () => {
        return HttpResponse.json({ message: "save failed" }, { status: 500 });
      }),
    );

    await expect(
      upsertBacklogItemsToStatus(
        "user-1",
        [createItem("move-me", "watching", 1000, "work-move")],
        ["work-move"],
        "stacked",
        {
          note: null,
          primary_platform: null,
        },
      ),
    ).resolves.toEqual({ error: "save failed" });
  });
});

describe("updateBacklogItem", () => {
  test("update 失敗時は 4xx のエラーボディを返す", async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/backlog_items`, () => {
        return HttpResponse.json({ message: "duplicate status transition" }, { status: 409 });
      }),
    );

    await expect(
      updateBacklogItem("item-1", {
        status: "watched",
        sort_order: 3000,
      }),
    ).resolves.toEqual({ error: "duplicate status transition" });
  });
});
