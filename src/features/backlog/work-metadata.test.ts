import type { TmdbWorkDetails } from "../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../test/test-lifecycle.ts";
import {
  buildTmdbWorkUpdate,
  calcBackgroundFitScore,
  calcCompletionLoadScore,
  calcFocusRequiredScore,
  getDurationBucket,
} from "./work-metadata.ts";

setupTestLifecycle();

function makeDetails(
  workType: TmdbWorkDetails["workType"],
  runtimeMinutes: number | null,
  typicalEpisodeRuntimeMinutes: number | null,
  overrides: Partial<TmdbWorkDetails> = {},
): TmdbWorkDetails {
  return {
    tmdbId: 1,
    tmdbMediaType: workType === "movie" ? "movie" : "tv",
    workType,
    title: "test",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: null,
    genres: [],
    runtimeMinutes,
    typicalEpisodeRuntimeMinutes,
    episodeCount: null,
    seasonCount: null,
    seasonNumber: null,
    ...overrides,
  };
}

describe("calcCompletionLoadScore", () => {
  describe("movie: 全体尺ベース", () => {
    test("short (≤30分) → 0", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 20, null))).toBe(0);
    });

    test("medium (≤70分) → 25", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 60, null))).toBe(25);
    });

    test("long (≤120分) → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 90, null))).toBe(50);
    });

    test("very_long (>120分) → 75", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", 150, null))).toBe(75);
    });

    test("尺不明 → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("movie", null, null))).toBe(50);
    });
  });

  describe("season/series: 1話尺ベース", () => {
    test("アニメ1話20分 → 0", () => {
      expect(calcCompletionLoadScore(makeDetails("season", null, 20))).toBe(0);
    });

    test("ドラマ1話45分 → 25", () => {
      expect(calcCompletionLoadScore(makeDetails("season", null, 45))).toBe(25);
    });

    test("長尺エピソード90分 → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("series", null, 90))).toBe(50);
    });

    test("1話尺不明 → 50", () => {
      expect(calcCompletionLoadScore(makeDetails("season", null, null))).toBe(50);
    });
  });
});

describe("genre score helpers", () => {
  test("focus_required は high genre を優先する", () => {
    expect(calcFocusRequiredScore(["コメディ", "ミステリー"])).toBe(75);
  });

  test("focus_required は low genre で 25 を返す", () => {
    expect(calcFocusRequiredScore(["コメディ"])).toBe(25);
  });

  test("background_fit は low genre を優先する", () => {
    expect(calcBackgroundFitScore(["コメディ", "ホラー"])).toBe(0);
  });

  test("background_fit は medium genre で 50 を返す", () => {
    expect(calcBackgroundFitScore(["ロマンス"])).toBe(50);
  });
});

describe("calcBackgroundFitScore: 評価による補正", () => {
  test("高評価（RT≥80）はジャンルスコア≥50を25に抑える", () => {
    expect(
      calcBackgroundFitScore(["コメディ"], { imdbRating: null, rottenTomatoesScore: 80 }),
    ).toBe(25);
  });

  test("高評価（IMDb≥8.0）はジャンルスコア≥50を25に抑える", () => {
    expect(
      calcBackgroundFitScore(["アクション"], { imdbRating: 8.0, rottenTomatoesScore: null }),
    ).toBe(25);
  });

  test("高評価でもジャンルスコアが0（low genre）なら0のまま", () => {
    expect(calcBackgroundFitScore(["ホラー"], { imdbRating: 9.0, rottenTomatoesScore: 95 })).toBe(
      0,
    );
  });

  test("ジャンルスコアが25（low-mid）なら高評価でも25のまま", () => {
    expect(calcBackgroundFitScore([], { imdbRating: 9.0, rottenTomatoesScore: 95 })).toBe(25);
  });

  test("評価がそこそこ（RT<80かつIMDb<8.0）はジャンルスコアをそのまま返す", () => {
    expect(calcBackgroundFitScore(["コメディ"], { imdbRating: 7.9, rottenTomatoesScore: 79 })).toBe(
      75,
    );
  });

  test("評価 null は補正なし", () => {
    expect(
      calcBackgroundFitScore(["コメディ"], { imdbRating: null, rottenTomatoesScore: null }),
    ).toBe(75);
  });
});

describe("getDurationBucket", () => {
  test("各バケット境界を判定する", () => {
    expect(getDurationBucket(null)).toBeNull();
    expect(getDurationBucket(30)).toBe("short");
    expect(getDurationBucket(70)).toBe("medium");
    expect(getDurationBucket(120)).toBe("long");
    expect(getDurationBucket(121)).toBe("very_long");
  });
});

describe("buildTmdbWorkUpdate", () => {
  test("検索用文字列と recommendation 用メタデータを組み立てる", () => {
    const details = makeDetails("movie", 95, null, {
      title: "My Movie",
      originalTitle: "Original",
      genres: ["ミステリー", "ロマンス"],
      overview: "overview",
      posterPath: "/poster.jpg",
      releaseDate: "2025-05-01",
      seasonCount: 2,
      seasonNumber: 1,
    });

    expect(buildTmdbWorkUpdate(details, "2026-04-01T00:00:00.000Z")).toEqual({
      title: "My Movie",
      original_title: "Original",
      search_text: "my movie original ミステリー ロマンス",
      overview: "overview",
      poster_path: "/poster.jpg",
      release_date: "2025-05-01",
      runtime_minutes: 95,
      typical_episode_runtime_minutes: null,
      duration_bucket: "long",
      episode_count: null,
      season_count: 2,
      season_number: 1,
      genres: ["ミステリー", "ロマンス"],
      focus_required_score: 75,
      background_fit_score: 0,
      completion_load_score: 50,
      last_tmdb_synced_at: "2026-04-01T00:00:00.000Z",
    });
  });
});
