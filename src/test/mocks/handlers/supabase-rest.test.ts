import { setupTestLifecycle } from "../../test-lifecycle.ts";
import {
  getMockBacklogItems,
  getMockWorks,
  setMockBacklogItems,
  setMockWorks,
} from "./supabase-rest.ts";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";

setupTestLifecycle();

function restUrl(path: string) {
  return `${SUPABASE_URL}/rest/v1/${path}`;
}

async function readJson(response: Response) {
  return (await response.json()) as unknown;
}

describe("supabaseRestHandlers", () => {
  test("object response 指定で 0 件なら 406 を返す", async () => {
    const response = await fetch(restUrl("works?select=id&tmdb_id=eq.999"), {
      headers: { accept: "application/vnd.pgrst.object+json" },
    });

    expect(response.status).toBe(406);
    await expect(readJson(response)).resolves.toEqual({
      message: "JSON object requested, multiple (or no) rows returned",
    });
  });

  test("object response 指定で複数件なら 406 を返す", async () => {
    setMockWorks([
      { id: "work-1", tmdb_id: 1, title: "作品1" },
      { id: "work-2", tmdb_id: 2, title: "作品2" },
    ]);

    const response = await fetch(restUrl("works?select=id,title"), {
      headers: { accept: "application/vnd.pgrst.object+json" },
    });

    expect(response.status).toBe(406);
    await expect(readJson(response)).resolves.toEqual({
      message: "JSON object requested, multiple (or no) rows returned",
    });
  });

  test("backlog_items を複数 order で取得すると null を含めて並び替える", async () => {
    setMockWorks([
      { id: "work-1", title: "作品1" },
      { id: "work-2", title: "作品2" },
      { id: "work-3", title: "作品3" },
    ]);
    setMockBacklogItems([
      { id: "item-1", work_id: "work-1", sort_order: 2000, display_title: "B" },
      { id: "item-2", work_id: "work-2", sort_order: 1000, display_title: null },
      { id: "item-3", work_id: "work-3", sort_order: 1000, display_title: "A" },
    ]);

    const response = await fetch(
      restUrl("backlog_items?order=sort_order.asc&order=display_title.asc"),
    );

    await expect(readJson(response)).resolves.toEqual([
      expect.objectContaining({ id: "item-2", display_title: null }),
      expect.objectContaining({ id: "item-3", display_title: "A" }),
      expect.objectContaining({ id: "item-1", display_title: "B" }),
    ]);
  });

  test("backlog_items の on_conflict=user_id,work_id で既存行を更新する", async () => {
    setMockBacklogItems([
      {
        id: "existing-item",
        user_id: "user-1",
        work_id: "work-1",
        status: "stacked",
        sort_order: 1000,
        note: null,
      },
    ]);

    const response = await fetch(restUrl("backlog_items?on_conflict=user_id,work_id"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: "user-1",
        work_id: "work-1",
        status: "watching",
        sort_order: 2000,
        note: "updated",
      }),
    });

    expect(response.status).toBe(201);
    expect(getMockBacklogItems()).toEqual([
      expect.objectContaining({
        id: "existing-item",
        status: "watching",
        sort_order: 2000,
        note: "updated",
      }),
    ]);
  });

  test("works の重複 insert は 409 を返す", async () => {
    setMockWorks([
      {
        id: "existing-work",
        created_by: "user-1",
        source_type: "tmdb",
        work_type: "movie",
        search_text: "same-title",
        title: "既存作品",
      },
    ]);

    const response = await fetch(restUrl("works"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        created_by: "user-1",
        source_type: "tmdb",
        work_type: "movie",
        search_text: "same-title",
        title: "重複作品",
      }),
    });

    expect(response.status).toBe(409);
    await expect(readJson(response)).resolves.toEqual({
      message: "duplicate key value",
      code: "23505",
    });
  });

  test("Prefer:return=representation なしの PATCH は 204 を返す", async () => {
    setMockWorks([
      {
        id: "work-1",
        tmdb_id: 10,
        title: "更新前",
      },
    ]);

    const response = await fetch(restUrl("works?tmdb_id=eq.10"), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "更新後" }),
    });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(getMockWorks()).toEqual([expect.objectContaining({ id: "work-1", title: "更新後" })]);
  });

  test("一致する backlog item が無ければ PATCH は 404 を返す", async () => {
    const response = await fetch(restUrl("backlog_items?id=eq.missing"), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: "updated" }),
    });

    expect(response.status).toBe(404);
    await expect(readJson(response)).resolves.toEqual({
      message: "Backlog item not found",
    });
  });
});
