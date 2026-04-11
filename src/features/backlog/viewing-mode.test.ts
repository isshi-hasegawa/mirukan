import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../test/backlog-fixtures.ts";
import { applyModeFilter, sortStackedItemsByViewingMode } from "./viewing-mode.ts";
import type { BacklogItem } from "./types.ts";

setupTestLifecycle();

function createItem(id: string, sortOrder: number): BacklogItem {
  return {
    id,
    status: "stacked",
    primary_platform: null,
    note: null,
    sort_order: sortOrder,
    works: createWorkSummary({ id: `work-${id}` }),
  };
}

describe("applyModeFilter", () => {
  describe("focus モード (≥80分)", () => {
    test("映画80分以上 → true", () => {
      expect(applyModeFilter(createWorkSummary({ runtime_minutes: 120 }), "focus")).toBe(true);
    });

    test("映画79分 → false", () => {
      expect(applyModeFilter(createWorkSummary({ runtime_minutes: 79 }), "focus")).toBe(false);
    });

    test("シリーズ1話80分 → true", () => {
      expect(
        applyModeFilter(
          createWorkSummary({ work_type: "series", typical_episode_runtime_minutes: 80 }),
          "focus",
        ),
      ).toBe(true);
    });

    test("尺不明 → false", () => {
      expect(applyModeFilter(createWorkSummary(), "focus")).toBe(false);
    });
  });

  describe("thoughtful モード (40-79分)", () => {
    test("映画50分 → true", () => {
      expect(applyModeFilter(createWorkSummary({ runtime_minutes: 50 }), "thoughtful")).toBe(true);
    });

    test("映画39分 → false", () => {
      expect(applyModeFilter(createWorkSummary({ runtime_minutes: 39 }), "thoughtful")).toBe(false);
    });

    test("映画80分 → false", () => {
      expect(applyModeFilter(createWorkSummary({ runtime_minutes: 80 }), "thoughtful")).toBe(false);
    });
  });

  describe("quick モード (<40分)", () => {
    test("映画30分 → true", () => {
      expect(applyModeFilter(createWorkSummary({ runtime_minutes: 30 }), "quick")).toBe(true);
    });

    test("映画40分 → false", () => {
      expect(applyModeFilter(createWorkSummary({ runtime_minutes: 40 }), "quick")).toBe(false);
    });
  });

  describe("background モード (background_fit_score ≥50)", () => {
    test("スコア75 → true", () => {
      expect(applyModeFilter(createWorkSummary({ background_fit_score: 75 }), "background")).toBe(
        true,
      );
    });

    test("スコア50 → true", () => {
      expect(applyModeFilter(createWorkSummary({ background_fit_score: 50 }), "background")).toBe(
        true,
      );
    });

    test("スコア25 → false", () => {
      expect(applyModeFilter(createWorkSummary({ background_fit_score: 25 }), "background")).toBe(
        false,
      );
    });

    test("スコア null → false", () => {
      expect(applyModeFilter(createWorkSummary({ background_fit_score: null }), "background")).toBe(
        false,
      );
    });
  });
});

describe("sortStackedItemsByViewingMode", () => {
  test("選択中ラベルのカードだけ先頭に寄せて、それ以外は元の順番を保つ", () => {
    const items = [
      createItem("a", 1000),
      createItem("b", 2000),
      createItem("c", 3000),
      createItem("d", 4000),
    ];

    items[0].works = createWorkSummary({ id: "wa", runtime_minutes: 95 });
    items[1].works = createWorkSummary({ id: "wb", runtime_minutes: 25 });
    items[2].works = createWorkSummary({ id: "wc", runtime_minutes: 110 });
    items[3].works = createWorkSummary({ id: "wd", runtime_minutes: 55 });

    expect(sortStackedItemsByViewingMode(items, "focus").map((item) => item.id)).toEqual([
      "a",
      "c",
      "b",
      "d",
    ]);
  });

  test("未選択なら既存の順番をそのまま返す", () => {
    const items = [createItem("a", 1000), createItem("b", 2000), createItem("c", 3000)];

    expect(sortStackedItemsByViewingMode(items, null).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});
