import { describe, expect, test } from "vite-plus/test";
import { resolveSeasonTitle } from "./tmdb.ts";

describe("resolveSeasonTitle", () => {
  test("generic Japanese season labels are prefixed with the series title", () => {
    expect(resolveSeasonTitle("コブラ会", 1, "シーズン1")).toBe("コブラ会 シーズン1");
  });

  test("generic English season labels are prefixed with the series title", () => {
    expect(resolveSeasonTitle("Cobra Kai", 2, "Season 2")).toBe("Cobra Kai シーズン2");
  });

  test("specific season title gets series prefix when series name is absent", () => {
    expect(resolveSeasonTitle("ブラック・ミラー", 6, "ジョーンはひどい人")).toBe(
      "ブラック・ミラー ジョーンはひどい人",
    );
  });

  test("season title already containing series name is kept as-is", () => {
    expect(resolveSeasonTitle("進撃の巨人", 4, "進撃の巨人 ファイナルシーズン")).toBe(
      "進撃の巨人 ファイナルシーズン",
    );
  });

  test("final season label without series name gets prefix", () => {
    expect(resolveSeasonTitle("進撃の巨人", 4, "ファイナルシーズン")).toBe(
      "進撃の巨人 ファイナルシーズン",
    );
  });

  test("falls back to series title when all candidates are blank", () => {
    expect(resolveSeasonTitle("コブラ会", 1, "", "   ", null, undefined)).toBe(
      "コブラ会 シーズン1",
    );
  });
});
