import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../test/backlog-fixtures.ts";
import {
  buildSelectedSubject,
  buildStackedBacklogOptions,
  confirmStackedSave,
} from "./add-submit-flow.ts";
import type { BacklogItem } from "./types.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";

setupTestLifecycle();

function createMovieResult(overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return {
    tmdbId: 1,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "作品タイトル",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: "2024-01-01",
    jpWatchPlatforms: [],
    hasJapaneseRelease: false,
    ...overrides,
  };
}

function createItem(
  id: string,
  status: BacklogItem["status"],
  workId: string,
  workOverrides: Partial<NonNullable<BacklogItem["works"]>> = {},
): BacklogItem {
  return {
    id,
    status,
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: createWorkSummary({
      id: workId,
      title: `作品 ${id}`,
      tmdb_id: null,
      tmdb_media_type: null,
      ...workOverrides,
    }),
  };
}

describe("buildSelectedSubject", () => {
  test("手動追加では trim 後のタイトルを使う", () => {
    expect(
      buildSelectedSubject({
        selectedTmdbResult: null,
        selectedSeasonNumbers: [],
        resolvedTitle: "  手動作品  ",
      }),
    ).toBe("「手動作品」");
  });

  test("TV で 4 シーズン以上選択したときは件数で要約する", () => {
    expect(
      buildSelectedSubject({
        selectedTmdbResult: createMovieResult({
          tmdbId: 10,
          tmdbMediaType: "tv",
          workType: "series",
          title: "シリーズ作品",
        }),
        selectedSeasonNumbers: [1, 2, 3, 4],
        resolvedTitle: "",
      }),
    ).toBe("4シーズン");
  });
});

describe("buildStackedBacklogOptions", () => {
  test("platform と note を保存用の形へ正規化する", () => {
    expect(buildStackedBacklogOptions("netflix", "  メモ  ")).toEqual({
      primary_platform: "netflix",
      note: "メモ",
    });
  });

  test("platform 未選択は null のまま保持する", () => {
    expect(buildStackedBacklogOptions(null, "  メモ  ")).toEqual({
      primary_platform: null,
      note: "メモ",
    });
  });
});

describe("confirmStackedSave", () => {
  test("既存カードがあれば確認用メッセージを返す", () => {
    const items = [createItem("item-1", "watched", "work-1")];

    expect(
      confirmStackedSave({
        items,
        workIds: ["work-1"],
        subject: "「作品タイトル」",
        emptyMessage: "すでにストックにあります。",
      }),
    ).toEqual({
      type: "confirm",
      message: "「作品タイトル」はすでに「視聴済み」にあります。ストックに戻しますか？",
    });
  });

  test("保存対象がなければ emptyMessage を返す", () => {
    const items = [createItem("item-1", "stacked", "work-1")];

    expect(
      confirmStackedSave({
        items,
        workIds: ["work-1"],
        subject: "「作品タイトル」",
        emptyMessage: "すでにストックにあります。",
      }),
    ).toEqual({
      type: "empty",
      message: "すでにストックにあります。",
    });
  });

  test("新規追加があれば保存を続行する", () => {
    expect(
      confirmStackedSave({
        items: [],
        workIds: ["work-1"],
        subject: "「作品タイトル」",
        emptyMessage: "すでにストックにあります。",
      }),
    ).toEqual({ type: "ready" });
  });
});
