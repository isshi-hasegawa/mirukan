const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../../lib/supabase.ts", () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import { BACKLOG_ITEM_SELECT, fetchBacklogItems } from "./backlog-repository.ts";

setupTestLifecycle();

function createSelectChain(result: {
  data: unknown[] | null;
  error: { message: string } | null;
}) {
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
