import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../test/backlog-fixtures.ts";
import {
  buildDetailFieldUpdate,
  buildMoveToStatusConfirmMessage,
  getNextSortOrder,
  getTopSortOrder,
  getSortOrderForDrop,
  getSortOrderForStatusChange,
  normalizeBacklogItems,
  planBacklogItemUpserts,
} from "./backlog-item-utils.ts";
import type { BacklogItem } from "./types.ts";

setupTestLifecycle();

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

describe("getNextSortOrder", () => {
  test("appends by 1000 within the same status", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "stacked", 2000),
      createItem("c", "watched", 1000),
    ];

    expect(getNextSortOrder(items, "stacked")).toBe(3000);
    expect(getNextSortOrder(items, "watching")).toBe(1000);
  });
});

describe("getTopSortOrder", () => {
  test("空列なら 1000 を返す", () => {
    expect(getTopSortOrder([], "stacked")).toBe(1000);
    expect(getTopSortOrder([], "stacked", 3)).toBe(1000);
  });

  test("1件挿入では最小 sort_order の 1000 前を返す", () => {
    const items = [createItem("a", "stacked", 1000), createItem("b", "stacked", 2000)];
    expect(getTopSortOrder(items, "stacked")).toBe(0);
  });

  test("複数件挿入では count 分手前から開始することで衝突を防ぐ", () => {
    const items = [createItem("a", "stacked", 1000), createItem("b", "stacked", 2000)];
    // 3件追加: 開始 sort_order は 1000 - 3*1000 = -2000
    // → -2000, -1000, 0 が割り当てられ、既存の 1000, 2000 と衝突しない
    expect(getTopSortOrder(items, "stacked", 3)).toBe(-2000);
  });
});

describe("planBacklogItemUpserts", () => {
  test("新規追加と既存カード移動と既存ストックを振り分ける", () => {
    const items = [
      createItem("a", "stacked", 1000, "work-1"),
      createItem("b", "watched", 2000, "work-2"),
    ];

    const result = planBacklogItemUpserts(items, ["work-1", "work-2", "work-3"], "stacked");

    expect(result.actions).toEqual([
      { type: "move", item: items[1] },
      { type: "insert", workId: "work-3" },
    ]);
    expect(result.existingTargetItems).toEqual([items[0]]);
    expect(result.existingOtherItems).toEqual([items[1]]);
  });
});

describe("buildMoveToStatusConfirmMessage", () => {
  test("重複カードの状態をまとめて確認文を作る", () => {
    const items = [
      createItem("a", "watched", 1000),
      createItem("b", "interrupted", 2000),
      createItem("c", "watched", 3000),
    ];

    expect(buildMoveToStatusConfirmMessage(items, "stacked", "シーズン1・シーズン2")).toBe(
      "シーズン1・シーズン2はすでに「視聴済み・中断」にあります。ストックに戻しますか？",
    );
  });
});

describe("getSortOrderForDrop", () => {
  test("places a card between neighboring cards in the same column", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "stacked", 2000),
      createItem("c", "stacked", 3000),
    ];

    expect(getSortOrderForDrop(items, "a", "stacked", "c", "before")).toBe(2500);
  });

  test("moves a card to the start of a target column", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "watching", 1000),
      createItem("c", "watching", 2000),
    ];

    expect(getSortOrderForDrop(items, "a", "watching", "b", "before")).toBe(0);
  });

  test("moves a card to the end of an empty target column", () => {
    const items = [createItem("a", "stacked", 1000)];

    expect(getSortOrderForDrop(items, "a", "watched", null, "after")).toBe(1000);
  });
});

describe("getSortOrderForStatusChange", () => {
  test("keeps the current sort order when the status does not change", () => {
    const items = [createItem("a", "stacked", 1000), createItem("b", "watched", 1000)];

    expect(getSortOrderForStatusChange(items, "a", "stacked")).toBe(1000);
  });

  test("moves the item to the end of the target column when the status changes", () => {
    const items = [
      createItem("a", "stacked", 1000),
      createItem("b", "watched", 1000),
      createItem("c", "watched", 2000),
    ];

    expect(getSortOrderForStatusChange(items, "a", "watched")).toBe(3000);
  });
});

describe("buildDetailFieldUpdate", () => {
  test("platform 編集では正規化した primary_platform を返す", () => {
    expect(buildDetailFieldUpdate("primaryPlatform", "netflix")).toEqual({
      primary_platform: "netflix",
    });
  });

  test("note 編集では trim 後の文字列を返す", () => {
    expect(buildDetailFieldUpdate("note", "  メモ  ")).toEqual({
      note: "メモ",
    });
  });

  test("空 note は null を返す", () => {
    expect(buildDetailFieldUpdate("note", "   ")).toEqual({
      note: null,
    });
  });
});

describe("normalizeBacklogItems", () => {
  test("flattens nested work arrays into single works", () => {
    const rows = [
      {
        id: "1",
        status: "stacked",
        primary_platform: null,
        note: null,
        sort_order: 1000,
        works: [createWorkSummary({ id: "w1" })],
      },
    ];

    const result = normalizeBacklogItems(rows);

    expect(result).toHaveLength(1);
    expect(result[0].works).toEqual(createWorkSummary({ id: "w1" }));
  });

  test("passes through single work objects", () => {
    const rows = [
      {
        id: "1",
        status: "stacked",
        primary_platform: null,
        note: null,
        sort_order: 1000,
        works: createWorkSummary({ id: "w1" }),
      },
    ];

    const result = normalizeBacklogItems(rows);

    expect(result).toHaveLength(1);
    expect(result[0].works).toEqual(createWorkSummary({ id: "w1" }));
  });

  test("excludes rows with null works", () => {
    const rows = [
      {
        id: "1",
        status: "stacked",
        primary_platform: null,
        note: null,
        sort_order: 1000,
        works: null,
      },
    ];

    expect(normalizeBacklogItems(rows)).toHaveLength(0);
  });

  test("excludes rows with invalid platform values", () => {
    const rows = [
      {
        id: "1",
        status: "stacked",
        primary_platform: "unsupported",
        note: null,
        sort_order: 1000,
        works: createWorkSummary({ id: "w1" }),
      },
    ];

    expect(normalizeBacklogItems(rows)).toHaveLength(0);
  });
});
