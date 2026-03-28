import { describe, expect, test } from "vite-plus/test";
import {
  getStringField,
  getNullableStringField,
  normalizePrimaryPlatform,
  buildSearchText,
  escapeHtml,
  getDropSide,
} from "./helpers.ts";

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
