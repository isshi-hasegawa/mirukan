import { renderHook, act, waitFor } from "@testing-library/react";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { useTmdbSearch } from "./useTmdbSearch.ts";

const tmdbMocks = vi.hoisted(() => ({
  fetchTmdbRecommendations: vi.fn(),
  fetchTmdbSeasonOptions: vi.fn(),
}));

vi.mock("../../../lib/tmdb.ts", async () => {
  const actual =
    await vi.importActual<typeof import("../../../lib/tmdb.ts")>("../../../lib/tmdb.ts");
  return {
    ...actual,
    fetchTmdbRecommendations: tmdbMocks.fetchTmdbRecommendations,
    fetchTmdbSeasonOptions: tmdbMocks.fetchTmdbSeasonOptions,
  };
});

setupTestLifecycle();

function createMovieResult(overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return {
    tmdbId: 1,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "テスト映画",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: null,
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
    ...overrides,
  };
}

function createTvResult(overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return createMovieResult({
    tmdbId: 10,
    tmdbMediaType: "tv",
    workType: "series",
    title: "テストシリーズ",
    ...overrides,
  });
}

function createSeasonOption(seasonNumber: number, title: string): TmdbSeasonOption {
  return {
    seasonNumber,
    title,
    overview: null,
    posterPath: null,
    releaseDate: null,
    episodeCount: null,
  };
}

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

describe("useTmdbSearch", () => {
  beforeEach(() => {
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([]);
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("映画を選択すると selectedTmdbResult がセットされ isTvSelection が false になる", async () => {
    const { result } = renderHook(() => useTmdbSearch({ items: [] }));
    const movieResult = createMovieResult();

    await act(async () => {
      await result.current.handleSelectResult(movieResult);
    });

    expect(result.current.selectedTmdbResult).toEqual(movieResult);
    expect(result.current.isTvSelection).toBe(false);
    expect(result.current.isLoadingSeasons).toBe(false);
    expect(tmdbMocks.fetchTmdbSeasonOptions).not.toHaveBeenCalled();
  });

  test("TV を選択すると isLoadingSeasons が true になり fetchTmdbSeasonOptions が呼ばれる", async () => {
    const seasonOptions = [createSeasonOption(2, "テストシリーズ シーズン2")];
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue(seasonOptions);

    const { result } = renderHook(() => useTmdbSearch({ items: [] }));
    const tvResult = createTvResult();

    await act(async () => {
      await result.current.handleSelectResult(tvResult);
    });

    expect(result.current.selectedTmdbResult).toEqual(tvResult);
    expect(result.current.isTvSelection).toBe(true);
    expect(tmdbMocks.fetchTmdbSeasonOptions).toHaveBeenCalledWith(tvResult);

    await waitFor(() => expect(result.current.isLoadingSeasons).toBe(false));
    expect(result.current.seasonOptions).toEqual(seasonOptions);
  });

  test("toggleSeasonSelection でシーズンの選択・解除ができる", async () => {
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([createSeasonOption(2, "シーズン2")]);

    const { result } = renderHook(() => useTmdbSearch({ items: [] }));
    const tvResult = createTvResult();

    await act(async () => {
      await result.current.handleSelectResult(tvResult);
    });
    await waitFor(() => expect(result.current.isLoadingSeasons).toBe(false));

    // シーズン2を選択
    act(() => {
      result.current.toggleSeasonSelection(2);
    });
    expect(result.current.selectedSeasonNumbers).toContain(2);

    // シーズン2を解除
    act(() => {
      result.current.toggleSeasonSelection(2);
    });
    expect(result.current.selectedSeasonNumbers).not.toContain(2);
  });

  test("toggleAllSeasons で未選択の全シーズンを一括選択・解除できる", async () => {
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([
      createSeasonOption(2, "シーズン2"),
      createSeasonOption(3, "シーズン3"),
    ]);

    const { result } = renderHook(() => useTmdbSearch({ items: [] }));
    const tvResult = createTvResult();

    await act(async () => {
      await result.current.handleSelectResult(tvResult);
    });
    await waitFor(() => expect(result.current.isLoadingSeasons).toBe(false));

    // 全シーズン選択
    act(() => {
      result.current.toggleAllSeasons();
    });
    expect(result.current.hasAllSeasonsSelected).toBe(true);
    expect(result.current.selectedSeasonNumbers).toContain(1);
    expect(result.current.selectedSeasonNumbers).toContain(2);
    expect(result.current.selectedSeasonNumbers).toContain(3);

    // 全解除
    act(() => {
      result.current.toggleAllSeasons();
    });
    // stacked ではないので全解除される
    expect(result.current.hasAllSeasonsSelected).toBe(false);
  });

  test("すでにストック済みのシーズンは stackedSeasonNumbers に含まれ toggleSeasonSelection で変更できない", async () => {
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([createSeasonOption(2, "シーズン2")]);

    const stackedItem = createItem({
      id: "stacked-s1",
      status: "stacked",
      works: createWorkSummary({
        id: "w-s1",
        title: "テストシリーズ",
        work_type: "series",
        source_type: "tmdb",
        tmdb_id: 10,
        tmdb_media_type: "tv",
      }),
    });

    const { result } = renderHook(() => useTmdbSearch({ items: [stackedItem] }));
    const tvResult = createTvResult();

    await act(async () => {
      await result.current.handleSelectResult(tvResult);
    });
    await waitFor(() => expect(result.current.isLoadingSeasons).toBe(false));

    const initialSelectedSeasons = [...result.current.selectedSeasonNumbers];

    // ストック済みシーズン1を toggle しようとしても変わらない
    act(() => {
      result.current.toggleSeasonSelection(1);
    });
    expect(result.current.selectedSeasonNumbers).toEqual(initialSelectedSeasons);
  });
});
