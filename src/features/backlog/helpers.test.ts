import { describe, expect, test } from "vite-plus/test";
import {
  getStringField,
  getNullableStringField,
  normalizePrimaryPlatform,
  buildSearchText,
  escapeHtml,
  getClientYFromPointerEvent,
  getDropIndicator,
  getDropSide,
  getDropSideFromRect,
  getWorkTypeLabel,
  resolveDropTarget,
} from "./helpers.ts";
import type { BacklogItem } from "./types.ts";

describe("getStringField", () => {
  test("returns the string value for a given key", () => {
    const fd = new FormData();
    fd.set("title", "テスト映画");
    expect(getStringField(fd, "title")).toBe("テスト映画");
  });

  test("returns empty string when key is missing", () => {
    const fd = new FormData();
    expect(getStringField(fd, "missing")).toBe("");
  });
});

describe("getNullableStringField", () => {
  test("returns trimmed value when non-empty", () => {
    const fd = new FormData();
    fd.set("note", "  メモ  ");
    expect(getNullableStringField(fd, "note")).toBe("メモ");
  });

  test("returns null when value is empty", () => {
    const fd = new FormData();
    fd.set("note", "");
    expect(getNullableStringField(fd, "note")).toBeNull();
  });

  test("returns null when value is whitespace only", () => {
    const fd = new FormData();
    fd.set("note", "   ");
    expect(getNullableStringField(fd, "note")).toBeNull();
  });
});

describe("normalizePrimaryPlatform", () => {
  test("returns null for empty string", () => {
    expect(normalizePrimaryPlatform("")).toBeNull();
  });

  test("returns the platform value as-is for non-empty string", () => {
    expect(normalizePrimaryPlatform("netflix")).toBe("netflix");
  });
});

describe("buildSearchText", () => {
  test("trims and lowercases the input", () => {
    expect(buildSearchText("  HELLO World  ")).toBe("hello world");
  });

  test("handles Japanese text", () => {
    expect(buildSearchText("テスト")).toBe("テスト");
  });
});

describe("escapeHtml", () => {
  test("escapes all HTML special characters", () => {
    expect(escapeHtml("<img src=\"x\" onerror='alert(1)'>&")).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;",
    );
  });

  test("returns unchanged string when no special characters", () => {
    expect(escapeHtml("hello")).toBe("hello");
  });
});

describe("getDropSide", () => {
  test("returns 'before' when clientY is in the upper half", () => {
    const el = { getBoundingClientRect: () => ({ top: 100, height: 80 }) } as HTMLElement;
    expect(getDropSide(el, 130)).toBe("before");
  });

  test("returns 'after' when clientY is in the lower half", () => {
    const el = { getBoundingClientRect: () => ({ top: 100, height: 80 }) } as HTMLElement;
    expect(getDropSide(el, 150)).toBe("after");
  });

  test("returns 'after' when clientY is exactly at the midpoint", () => {
    const el = { getBoundingClientRect: () => ({ top: 100, height: 80 }) } as HTMLElement;
    expect(getDropSide(el, 140)).toBe("after");
  });
});

describe("getDropSideFromRect", () => {
  test("returns the same side judgment without DOM access", () => {
    expect(getDropSideFromRect({ top: 100, height: 80 }, 130)).toBe("before");
    expect(getDropSideFromRect({ top: 100, height: 80 }, 150)).toBe("after");
  });
});

describe("getClientYFromPointerEvent", () => {
  test("returns mouse clientY", () => {
    const event = { type: "mousemove", clientY: 180 } as MouseEvent;
    expect(getClientYFromPointerEvent(event, { top: 100, height: 80 })).toBe(180);
  });

  test("returns touches clientY for touchmove", () => {
    const event = {
      type: "touchmove",
      touches: [{ clientY: 170 }],
      changedTouches: [],
    } as unknown as TouchEvent;
    expect(getClientYFromPointerEvent(event, { top: 100, height: 80 })).toBe(170);
  });

  test("returns changedTouches clientY for touchend when requested", () => {
    const event = {
      type: "touchend",
      touches: [],
      changedTouches: [{ clientY: 190 }],
    } as unknown as TouchEvent;
    expect(getClientYFromPointerEvent(event, { top: 100, height: 80 }, "changedTouches")).toBe(190);
  });

  test("falls back to midpoint when event is missing", () => {
    expect(getClientYFromPointerEvent(null, { top: 100, height: 80 })).toBe(140);
  });
});

describe("getDropIndicator", () => {
  test("returns column indicator for column targets", () => {
    expect(getDropIndicator("column:watched", { top: 100, height: 80 }, 140)).toEqual({
      type: "column",
      status: "watched",
    });
  });

  test("returns card indicator with before/after side", () => {
    expect(getDropIndicator("item-1", { top: 100, height: 80 }, 120)).toEqual({
      type: "card",
      itemId: "item-1",
      side: "before",
    });
  });
});

describe("resolveDropTarget", () => {
  const items: BacklogItem[] = [
    {
      id: "item-1",
      status: "watching",
      primary_platform: null,
      note: null,
      sort_order: 100,
      works: null,
    },
  ];

  test("resolves column drops without target item", () => {
    expect(resolveDropTarget(items, "column:stacked", { top: 0, height: 100 }, 50)).toEqual({
      status: "stacked",
      targetItemId: null,
      side: "after",
    });
  });

  test("resolves card drops using the target item status", () => {
    expect(resolveDropTarget(items, "item-1", { top: 0, height: 100 }, 20)).toEqual({
      status: "watching",
      targetItemId: "item-1",
      side: "before",
    });
  });

  test("returns null when the over item does not exist", () => {
    expect(resolveDropTarget(items, "missing", { top: 0, height: 100 }, 20)).toBeNull();
  });
});

describe("getWorkTypeLabel", () => {
  test("returns movie for movie works", () => {
    expect(getWorkTypeLabel("movie")).toBe("映画");
  });

  test("returns series for series works", () => {
    expect(getWorkTypeLabel("series")).toBe("シリーズ");
  });

  test("returns series for season works", () => {
    expect(getWorkTypeLabel("season")).toBe("シリーズ");
  });
});
