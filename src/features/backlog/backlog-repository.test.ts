const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../../lib/supabase.ts", () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import {
  BACKLOG_ITEM_SELECT,
  fetchBacklogItems,
  upsertBacklogItemsToStatus,
} from "./backlog-repository.ts";
import type { BacklogItem } from "./types.ts";

setupTestLifecycle();

function createSelectChain(result: { data: unknown[] | null; error: { message: string } | null }) {
  const chain = {
    order: vi.fn(),
  };

  chain.order.mockImplementation((column: string) => {
    if (column === "created_at") {
      return Promise.resolve(result);
    }
    return chain;
  });

  return chain;
}

function createBacklogItemsTableMock(error: { message: string } | null = null) {
  return {
    upsert: vi.fn(async () => ({ error })),
  };
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
    works: {
      id: workId,
      title: `Title ${id}`,
      work_type: "movie",
      source_type: "manual",
      tmdb_id: null,
      tmdb_media_type: null,
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
    },
  };
}

describe("fetchBacklogItems", () => {
  beforeEach(() => {
    supabaseMocks.from.mockReset();
  });

  test("query 定義を repository に集約し、works を正規化して返す", async () => {
    const selectChain = createSelectChain({
      data: [
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
            },
          ],
        },
      ],
      error: null,
    });
    const select = vi.fn(() => selectChain);
    supabaseMocks.from.mockReturnValue({ select });

    const result = await fetchBacklogItems();

    expect(supabaseMocks.from).toHaveBeenCalledWith("backlog_items");
    expect(select).toHaveBeenCalledWith(BACKLOG_ITEM_SELECT);
    expect(selectChain.order).toHaveBeenNthCalledWith(1, "sort_order");
    expect(selectChain.order).toHaveBeenNthCalledWith(2, "created_at");
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
    const selectChain = createSelectChain({
      data: null,
      error: { message: "network failed" },
    });
    supabaseMocks.from.mockReturnValue({
      select: vi.fn(() => selectChain),
    });

    await expect(fetchBacklogItems()).resolves.toEqual({
      data: [],
      error: "network failed",
    });
  });
});

describe("upsertBacklogItemsToStatus", () => {
  beforeEach(() => {
    supabaseMocks.from.mockReset();
  });

  test("空入力または action なしなら no-op", async () => {
    await expect(
      upsertBacklogItemsToStatus("user-1", [], [], "stacked", {
        note: null,
        primaryPlatform: null,
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
          primaryPlatform: "netflix",
        },
      ),
    ).resolves.toEqual({ error: null });

    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  test("insert と move が混在しても先頭側から sort_order を振る", async () => {
    const backlogItemsTable = createBacklogItemsTableMock();
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "backlog_items") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return backlogItemsTable;
    });

    const items = [
      createItem("existing-top", "stacked", 3000, "work-top"),
      createItem("move-me", "watching", 1000, "work-move"),
    ];

    await expect(
      upsertBacklogItemsToStatus("user-1", items, ["work-move", "work-new"], "stacked", {
        note: "新規メモ",
        primaryPlatform: "netflix",
      }),
    ).resolves.toEqual({ error: null });

    expect(backlogItemsTable.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: "user-1",
          work_id: "work-move",
          status: "stacked",
          primary_platform: null,
          note: null,
          sort_order: 2000,
        },
        {
          user_id: "user-1",
          work_id: "work-new",
          status: "stacked",
          primary_platform: "netflix",
          note: "新規メモ",
          sort_order: 3000,
        },
      ],
      { onConflict: "user_id,work_id" },
    );
  });

  test("upsert 失敗時はエラーを返す", async () => {
    const backlogItemsTable = createBacklogItemsTableMock({ message: "save failed" });
    supabaseMocks.from.mockImplementation((table: string) => {
      if (table !== "backlog_items") {
        throw new Error(`Unexpected table: ${table}`);
      }
      return backlogItemsTable;
    });

    await expect(
      upsertBacklogItemsToStatus(
        "user-1",
        [createItem("move-me", "watching", 1000, "work-move")],
        ["work-move"],
        "stacked",
        {
          note: null,
          primaryPlatform: null,
        },
      ),
    ).resolves.toEqual({ error: "save failed" });
  });
});
