import {
  resolveDragOverItems,
  resolveDropPersistence,
  type RectLike,
} from "./useBacklogDnd.logic.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem } from "../types.ts";

setupTestLifecycle();

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "item-1",
    status: "stacked",
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: null,
    ...overrides,
  };
}

function makeRect(top = 100, height = 200): RectLike {
  return { top, height };
}

function createTouchEvent(clientY?: number): TouchEvent {
  return {
    type: "touchmove",
    touches: clientY === undefined ? [] : [{ clientY }],
    changedTouches: clientY === undefined ? [] : [{ clientY }],
  } as unknown as TouchEvent;
}

describe("resolveDragOverItems", () => {
  test("同列内では pointer 位置に応じて before/after を切り替える", () => {
    const items = [
      createItem({ id: "item-1", sort_order: 1000 }),
      createItem({ id: "item-2", sort_order: 2000 }),
      createItem({ id: "item-3", sort_order: 3000 }),
    ];

    const beforeItems = resolveDragOverItems({
      items,
      activeId: "item-3",
      overId: "item-2",
      rect: makeRect(),
      activatorEvent: { clientY: 120 } as MouseEvent,
      isMobileLayout: false,
    });
    const afterItems = resolveDragOverItems({
      items,
      activeId: "item-1",
      overId: "item-2",
      rect: makeRect(),
      activatorEvent: { clientY: 260 } as MouseEvent,
      isMobileLayout: false,
    });

    expect(beforeItems.map((item) => item.id)).toEqual(["item-1", "item-3", "item-2"]);
    expect(afterItems.map((item) => item.id)).toEqual(["item-2", "item-1", "item-3"]);
  });

  test("touch event でも clientY を読んで列またぎ挿入位置を決める", () => {
    const items = [
      createItem({ id: "item-1", status: "stacked" }),
      createItem({ id: "item-2", status: "watching", sort_order: 1000 }),
      createItem({ id: "item-3", status: "watching", sort_order: 2000 }),
    ];

    const nextItems = resolveDragOverItems({
      items,
      activeId: "item-1",
      overId: "item-3",
      rect: makeRect(),
      activatorEvent: createTouchEvent(120),
      isMobileLayout: false,
    });

    expect(nextItems.filter((item) => item.status === "watching").map((item) => item.id)).toEqual([
      "item-2",
      "item-1",
      "item-3",
    ]);
  });

  test("touch event に座標が無ければ rect 中央を使って after 扱いにする", () => {
    const items = [
      createItem({ id: "item-1", status: "stacked" }),
      createItem({ id: "item-2", status: "watching", sort_order: 1000 }),
      createItem({ id: "item-3", status: "watching", sort_order: 2000 }),
    ];

    const nextItems = resolveDragOverItems({
      items,
      activeId: "item-1",
      overId: "item-2",
      rect: makeRect(),
      activatorEvent: createTouchEvent(),
      isMobileLayout: false,
    });

    expect(nextItems.filter((item) => item.status === "watching").map((item) => item.id)).toEqual([
      "item-2",
      "item-1",
      "item-3",
    ]);
  });

  test("watched 列の背景ドロップでは列先頭に入れる", () => {
    const items = [
      createItem({ id: "item-1", status: "stacked" }),
      createItem({ id: "item-2", status: "watched", sort_order: 1000 }),
      createItem({ id: "item-3", status: "watched", sort_order: 2000 }),
    ];

    const nextItems = resolveDragOverItems({
      items,
      activeId: "item-1",
      overId: "column:watched",
      rect: makeRect(),
      activatorEvent: null,
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
      createItem({ id: "item-1", status: "stacked" }),
      createItem({ id: "item-2", status: "watching" }),
    ];

    expect(
      resolveDragOverItems({
        items,
        activeId: "item-1",
        overId: "item-2",
        rect: makeRect(),
        activatorEvent: null,
        isMobileLayout: true,
      }),
    ).toEqual(items);
  });

  test("対象が見つからない場合や同一 id への drag over は何もしない", () => {
    const items = [createItem({ id: "item-1" }), createItem({ id: "item-2" })];

    expect(
      resolveDragOverItems({
        items,
        activeId: "missing",
        overId: "item-2",
        rect: makeRect(),
        activatorEvent: null,
        isMobileLayout: false,
      }),
    ).toBe(items);
    expect(
      resolveDragOverItems({
        items,
        activeId: "item-1",
        overId: "item-1",
        rect: makeRect(),
        activatorEvent: null,
        isMobileLayout: false,
      }),
    ).toBe(items);
  });
});

describe("resolveDropPersistence", () => {
  test("先頭挿入では次要素の sort_order から補間する", () => {
    const items = [
      createItem({ id: "item-1", sort_order: 1000 }),
      createItem({ id: "item-2", sort_order: 2000 }),
      createItem({ id: "item-3", sort_order: 3000 }),
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
      createItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
      createItem({ id: "item-2", status: "watching", sort_order: 1000 }),
      createItem({ id: "item-3", status: "watching", sort_order: 2000 }),
    ];
    const localItems = [
      items[1],
      items[2],
      createItem({ id: "item-1", status: "watching", sort_order: 1000 }),
    ];

    expect(resolveDropPersistence({ items, localItems, activeId: "item-1" })).toEqual({
      activeId: "item-1",
      status: "watching",
      sortOrder: 3000,
    });
  });

  test("前後要素がある場合は中間値を使う", () => {
    const items = [
      createItem({ id: "item-1", sort_order: 1000 }),
      createItem({ id: "item-2", sort_order: 2000 }),
      createItem({ id: "item-3", sort_order: 3000 }),
    ];
    const localItems = [items[0], items[2], items[1]];

    expect(resolveDropPersistence({ items, localItems, activeId: "item-3" })).toEqual({
      activeId: "item-3",
      status: "stacked",
      sortOrder: 1500,
    });
  });

  test("列内に 1 件だけなら初期 sort_order を使う", () => {
    const items = [createItem({ id: "item-1", status: "stacked", sort_order: 1000 })];

    expect(resolveDropPersistence({ items, localItems: items, activeId: "item-1" })).toEqual({
      activeId: "item-1",
      status: "stacked",
      sortOrder: 1000,
    });
  });

  test("drag 中アイテムが localItems に無ければ null を返す", () => {
    const items = [createItem({ id: "item-1", sort_order: 1000 })];

    expect(resolveDropPersistence({ items, localItems: items, activeId: "missing" })).toBeNull();
  });
});
