import { resolveDragOverItems, resolveDropPersistence } from "./useBacklogDnd.logic.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createBacklogItem, makeLogicRect } from "./useBacklogDnd.test-helpers.ts";

setupTestLifecycle();

function watchingIds(items: ReturnType<typeof createWatchingItemsFixture>) {
  return items.filter((item) => item.status === "watching").map((item) => item.id);
}

function createWatchingItemsFixture() {
  return [
    createBacklogItem({ id: "item-1", status: "stacked" }),
    createBacklogItem({ id: "item-2", status: "watching", sort_order: 1000 }),
    createBacklogItem({ id: "item-3", status: "watching", sort_order: 2000 }),
  ];
}

describe("resolveDragOverItems", () => {
  test("同列内では active item の位置に応じて before/after を切り替える", () => {
    const items = [
      createBacklogItem({ id: "item-1", sort_order: 1000 }),
      createBacklogItem({ id: "item-2", sort_order: 2000 }),
      createBacklogItem({ id: "item-3", sort_order: 3000 }),
    ];

    // active center (50+50=100) < over center (100+100=200) → before
    const beforeItems = resolveDragOverItems({
      items,
      activeId: "item-3",
      overId: "item-2",
      overRect: makeLogicRect(100, 200),
      activeRect: makeLogicRect(50, 100),
      isMobileLayout: false,
    });
    // active center (250+50=300) > over center (100+100=200) → after
    const afterItems = resolveDragOverItems({
      items,
      activeId: "item-1",
      overId: "item-2",
      overRect: makeLogicRect(100, 200),
      activeRect: makeLogicRect(250, 100),
      isMobileLayout: false,
    });

    expect(beforeItems.map((item) => item.id)).toEqual(["item-1", "item-3", "item-2"]);
    expect(afterItems.map((item) => item.id)).toEqual(["item-2", "item-1", "item-3"]);
  });

  test("隣接要素への移動（1つ上・1つ下）が正しく動作する", () => {
    const items = [
      createBacklogItem({ id: "item-1", sort_order: 1000 }),
      createBacklogItem({ id: "item-2", sort_order: 2000 }),
    ];

    // item-1 を item-2 の下へ: active center > over center → after
    const moveDown = resolveDragOverItems({
      items,
      activeId: "item-1",
      overId: "item-2",
      overRect: makeLogicRect(200, 100),
      activeRect: makeLogicRect(300, 100),
      isMobileLayout: false,
    });
    // item-2 を item-1 の上へ: active center < over center → before
    const moveUp = resolveDragOverItems({
      items,
      activeId: "item-2",
      overId: "item-1",
      overRect: makeLogicRect(100, 100),
      activeRect: makeLogicRect(0, 100),
      isMobileLayout: false,
    });

    expect(moveDown.map((item) => item.id)).toEqual(["item-2", "item-1"]);
    expect(moveUp.map((item) => item.id)).toEqual(["item-2", "item-1"]);
  });

  test.each([
    {
      name: "active が over より上なら before として列またぎ挿入する",
      overId: "item-3",
      activeRect: makeLogicRect(50, 100), // center=100 < overRect center=200
    },
    {
      name: "active が over と同じ中心なら after として列またぎ挿入する",
      overId: "item-2",
      activeRect: makeLogicRect(100, 200), // center=200 = overRect center=200 → not < → after
    },
  ])("$name", ({ overId, activeRect }) => {
    const nextItems = resolveDragOverItems({
      items: createWatchingItemsFixture(),
      activeId: "item-1",
      overId,
      overRect: makeLogicRect(),
      activeRect,
      isMobileLayout: false,
    });

    expect(watchingIds(nextItems)).toEqual(["item-2", "item-1", "item-3"]);
  });

  test("watched 列の背景ドロップでは列先頭に入れる", () => {
    const items = [
      createBacklogItem({ id: "item-1", status: "stacked" }),
      createBacklogItem({ id: "item-2", status: "watched", sort_order: 1000 }),
      createBacklogItem({ id: "item-3", status: "watched", sort_order: 2000 }),
    ];

    const nextItems = resolveDragOverItems({
      items,
      activeId: "item-1",
      overId: "column:watched",
      overRect: makeLogicRect(),
      activeRect: makeLogicRect(),
      isMobileLayout: false,
    });

    expect(nextItems.filter((item) => item.status === "watched").map((item) => item.id)).toEqual([
      "item-1",
      "item-2",
      "item-3",
    ]);
  });

  test("モバイルでは列またぎ移動を抑止する", () => {
    const items = [
      createBacklogItem({ id: "item-1", status: "stacked" }),
      createBacklogItem({ id: "item-2", status: "watching" }),
    ];

    expect(
      resolveDragOverItems({
        items,
        activeId: "item-1",
        overId: "item-2",
        overRect: makeLogicRect(),
        activeRect: makeLogicRect(),
        isMobileLayout: true,
      }),
    ).toEqual(items);
  });

  test("対象が見つからない場合や同一 id への drag over は何もしない", () => {
    const items = [createBacklogItem({ id: "item-1" }), createBacklogItem({ id: "item-2" })];

    expect(
      resolveDragOverItems({
        items,
        activeId: "missing",
        overId: "item-2",
        overRect: makeLogicRect(),
        activeRect: makeLogicRect(),
        isMobileLayout: false,
      }),
    ).toBe(items);
    expect(
      resolveDragOverItems({
        items,
        activeId: "item-1",
        overId: "item-1",
        overRect: makeLogicRect(),
        activeRect: makeLogicRect(),
        isMobileLayout: false,
      }),
    ).toBe(items);
  });
});

describe("resolveDropPersistence", () => {
  test("先頭挿入では次要素の sort_order から補間する", () => {
    const items = [
      createBacklogItem({ id: "item-1", sort_order: 1000 }),
      createBacklogItem({ id: "item-2", sort_order: 2000 }),
      createBacklogItem({ id: "item-3", sort_order: 3000 }),
    ];
    const localItems = [items[2], items[0], items[1]];

    expect(resolveDropPersistence({ items, localItems, activeId: "item-3" })).toEqual({
      activeId: "item-3",
      status: "stacked",
      sortOrder: 0,
    });
  });

  test("末尾挿入では直前要素の sort_order に 1000 足す", () => {
    const items = [
      createBacklogItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
      createBacklogItem({ id: "item-2", status: "watching", sort_order: 1000 }),
      createBacklogItem({ id: "item-3", status: "watching", sort_order: 2000 }),
    ];
    const localItems = [
      items[1],
      items[2],
      createBacklogItem({ id: "item-1", status: "watching", sort_order: 1000 }),
    ];

    expect(resolveDropPersistence({ items, localItems, activeId: "item-1" })).toEqual({
      activeId: "item-1",
      status: "watching",
      sortOrder: 3000,
    });
  });

  test("前後要素がある場合は中間値を使う", () => {
    const items = [
      createBacklogItem({ id: "item-1", sort_order: 1000 }),
      createBacklogItem({ id: "item-2", sort_order: 2000 }),
      createBacklogItem({ id: "item-3", sort_order: 3000 }),
    ];
    const localItems = [items[0], items[2], items[1]];

    expect(resolveDropPersistence({ items, localItems, activeId: "item-3" })).toEqual({
      activeId: "item-3",
      status: "stacked",
      sortOrder: 1500,
    });
  });

  test("列内に 1 件だけなら初期 sort_order を使う", () => {
    const items = [createBacklogItem({ id: "item-1", status: "stacked", sort_order: 1000 })];

    expect(resolveDropPersistence({ items, localItems: items, activeId: "item-1" })).toEqual({
      activeId: "item-1",
      status: "stacked",
      sortOrder: 1000,
    });
  });

  test("drag 中アイテムが localItems に無ければ null を返す", () => {
    const items = [createBacklogItem({ id: "item-1", sort_order: 1000 })];

    expect(resolveDropPersistence({ items, localItems: items, activeId: "missing" })).toBeNull();
  });
});
