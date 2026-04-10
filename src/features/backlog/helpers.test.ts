import {
  createDetailEditingState,
  createDetailModalState,
  getStringField,
  getNullableStringField,
  normalizePrimaryPlatform,
  buildSearchText,
  escapeHtml,
  getTmdbSearchResultMetadataLabels,
  getWorkMetadataLabels,
  getWorkTypeLabel,
} from "./helpers.ts";
import type { TmdbSearchResult } from "../../lib/tmdb.ts";
import type { BacklogItem } from "./types.ts";
import { setupTestLifecycle } from "../../test/test-lifecycle.ts";

setupTestLifecycle();

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

  test("returns null for unsupported platform values", () => {
    expect(normalizePrimaryPlatform("unsupported")).toBeNull();
  });
});

describe("createDetailModalState", () => {
  test("returns the default modal state", () => {
    expect(createDetailModalState("item-1")).toEqual({
      openItemId: "item-1",
      editingField: null,
      draftValue: "",
      message: null,
    });
  });
});

describe("createDetailEditingState", () => {
  const item: BacklogItem = {
    id: "item-1",
    status: "watching",
    primary_platform: "netflix",
    note: "既存メモ",
    sort_order: 100,
    works: null,
  };

  test("builds the draft state for platform editing", () => {
    expect(createDetailEditingState(item, "primaryPlatform")).toEqual({
      openItemId: "item-1",
      editingField: "primaryPlatform",
      draftValue: "netflix",
      message: null,
    });
  });

  test("builds the draft state for note editing", () => {
    expect(createDetailEditingState(item, "note")).toEqual({
      openItemId: "item-1",
      editingField: "note",
      draftValue: "既存メモ",
      message: null,
    });
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

describe("getWorkMetadataLabels", () => {
  const baseWork: BacklogItem["works"] = {
    id: "work-1",
    title: "テスト作品",
    work_type: "movie",
    source_type: "tmdb",
    tmdb_id: 1,
    tmdb_media_type: "movie",
    original_title: null,
    overview: null,
    poster_path: null,
    release_date: "2024-01-01",
    runtime_minutes: 120,
    typical_episode_runtime_minutes: null,
    duration_bucket: null,
    genres: [],
    season_count: null,
    season_number: null,
    focus_required_score: null,
    background_fit_score: null,
    completion_load_score: null,
    rotten_tomatoes_score: null,
    imdb_rating: null,
    imdb_votes: null,
    metacritic_score: null,
  };

  test("映画は公開年と上映時間をそのまま表示する", () => {
    expect(
      getWorkMetadataLabels(baseWork!, {
        includeReleaseYear: true,
        includeRuntime: true,
      }),
    ).toEqual(["2024年", "120分"]);
  });

  test("シリーズは平均 runtime を約表記にする", () => {
    expect(
      getWorkMetadataLabels(
        {
          ...baseWork!,
          work_type: "series",
          tmdb_media_type: "tv",
          runtime_minutes: null,
          typical_episode_runtime_minutes: 45,
          season_count: 1,
        },
        {
          includeReleaseYear: true,
          includeRuntime: true,
          includeSeasonCount: true,
        },
      ),
    ).toEqual(["2024年", "1話約45分", "全1シーズン"]);
  });
});

describe("getTmdbSearchResultMetadataLabels", () => {
  test("検索結果の公開年ラベルを返す", () => {
    const result: TmdbSearchResult = {
      tmdbId: 1,
      tmdbMediaType: "movie",
      workType: "movie",
      title: "テスト作品",
      originalTitle: null,
      overview: null,
      posterPath: null,
      releaseDate: "2024-01-01",
      jpWatchPlatforms: [],
      hasJapaneseRelease: true,
      rottenTomatoesScore: null,
    };

    expect(getTmdbSearchResultMetadataLabels(result)).toEqual(["2024年"]);
  });
});
