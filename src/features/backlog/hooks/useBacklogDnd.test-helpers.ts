import type { BacklogItem } from "../types.ts";
import type { RectLike } from "./useBacklogDnd.logic.ts";

export function createBacklogItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
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

export function createStackedItems(): BacklogItem[] {
  return [
    createBacklogItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
    createBacklogItem({ id: "item-2", status: "stacked", sort_order: 2000 }),
  ];
}

export function createWatchingItems(): BacklogItem[] {
  return [
    createBacklogItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
    createBacklogItem({ id: "item-2", status: "watching", sort_order: 1000 }),
    createBacklogItem({ id: "item-3", status: "watching", sort_order: 2000 }),
  ];
}

export function createMixedColumnItems(): BacklogItem[] {
  return [
    createBacklogItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
    createBacklogItem({ id: "item-2", status: "stacked", sort_order: 2000 }),
    createBacklogItem({ id: "item-3", status: "watching", sort_order: 1000 }),
  ];
}

export function makeLogicRect(top = 100, height = 200): RectLike {
  return { top, height };
}

export function makeDomRect(top = 100, height = 200): DOMRect {
  return {
    top,
    height,
    left: 0,
    right: 100,
    bottom: top + height,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}
