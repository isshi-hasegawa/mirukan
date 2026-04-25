import { renderHook, act } from "@testing-library/react";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { useTmdbSearchRequest } from "./useTmdbSearchRequest.ts";

const tmdbMocks = vi.hoisted(() => ({
  fetchTmdbRecommendations: vi.fn(),
  searchTmdbWorks: vi.fn(),
}));

vi.mock("../../../lib/tmdb.ts", async () => {
  const actual =
    await vi.importActual<typeof import("../../../lib/tmdb.ts")>("../../../lib/tmdb.ts");
  return {
    ...actual,
    fetchTmdbRecommendations: tmdbMocks.fetchTmdbRecommendations,
    searchTmdbWorks: tmdbMocks.searchTmdbWorks,
  };
});

setupTestLifecycle();

function createItem(id: string, status: BacklogItem["status"], tmdbId: number): BacklogItem {
  return {
    id,
    status,
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: createWorkSummary({
      id: `work-${id}`,
      title: `title-${id}`,
      tmdb_id: tmdbId,
    }),
  };
}

describe("useTmdbSearchRequest", () => {
  const onResetSelection = vi.fn();
  const onSetSearchMessage = vi.fn();

  beforeEach(() => {
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  test("マウント時に fetchTmdbRecommendations が呼ばれる", async () => {
    renderHook(() => useTmdbSearchRequest({ items: [], onResetSelection, onSetSearchMessage }));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(tmdbMocks.fetchTmdbRecommendations).toHaveBeenCalledTimes(1);
  });

  test("推薦元は watched を優先しつつ Fisher-Yates でシャッフルする", async () => {
    const getRandomValuesSpy = vi
      .spyOn(globalThis.crypto, "getRandomValues")
      .mockImplementation((array) => {
        if (array instanceof Uint32Array) {
          array[0] = 0;
        }
        return array;
      });

    renderHook(() =>
      useTmdbSearchRequest({
        items: [
          createItem("watched-1", "watched", 1),
          createItem("watching-1", "watching", 3),
          createItem("watched-2", "watched", 2),
          createItem("watching-2", "watching", 4),
        ],
        onResetSelection,
        onSetSearchMessage,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(tmdbMocks.fetchTmdbRecommendations).toHaveBeenCalledWith([
      { tmdbId: 2, tmdbMediaType: "movie" },
      { tmdbId: 1, tmdbMediaType: "movie" },
      { tmdbId: 4, tmdbMediaType: "movie" },
      { tmdbId: 3, tmdbMediaType: "movie" },
    ]);

    getRandomValuesSpy.mockRestore();
  });

  test("handleQueryChange でクエリ入力後、デバウンス経過で searchTmdbWorks が呼ばれる", async () => {
    const { result } = renderHook(() =>
      useTmdbSearchRequest({ items: [], onResetSelection, onSetSearchMessage }),
    );

    // 推薦フェッチを先に済ませる
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.handleQueryChange("テスト映画");
    });

    // デバウンス前は呼ばれない
    expect(tmdbMocks.searchTmdbWorks).not.toHaveBeenCalled();

    // デバウンスタイマーを進めて非同期処理を完了させる
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(tmdbMocks.searchTmdbWorks).toHaveBeenCalledWith("テスト映画");
  });

  test("handleQueryChange で空文字を渡すと検索をリセットする", async () => {
    const { result } = renderHook(() =>
      useTmdbSearchRequest({ items: [], onResetSelection, onSetSearchMessage }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // まず検索状態にする
    act(() => {
      result.current.handleQueryChange("テスト");
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    tmdbMocks.searchTmdbWorks.mockClear();
    onResetSelection.mockClear();

    // 空クエリでリセット
    act(() => {
      result.current.handleQueryChange("");
    });

    expect(onResetSelection).toHaveBeenCalled();
    expect(tmdbMocks.searchTmdbWorks).not.toHaveBeenCalled();
  });

  test("handleCompositionEnd で変換確定後に検索が実行される", async () => {
    const { result } = renderHook(() =>
      useTmdbSearchRequest({ items: [], onResetSelection, onSetSearchMessage }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.handleCompositionEnd("日本語クエリ");
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(tmdbMocks.searchTmdbWorks).toHaveBeenCalledWith("日本語クエリ");
  });

  test("searchTmdbWorks が結果なしを返したときに onSetSearchMessage が呼ばれる", async () => {
    tmdbMocks.searchTmdbWorks.mockResolvedValue([]);

    const { result } = renderHook(() =>
      useTmdbSearchRequest({ items: [], onResetSelection, onSetSearchMessage }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.handleQueryChange("見つからない映画");
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onSetSearchMessage).toHaveBeenCalledWith(
      expect.stringContaining("候補が見つかりませんでした"),
    );
  });

  test("検索結果がすべて既存ストックと重なると除外メッセージを出す", async () => {
    tmdbMocks.searchTmdbWorks.mockResolvedValue([
      {
        tmdbId: 10,
        tmdbMediaType: "movie",
        workType: "movie",
        title: "既存作品",
        originalTitle: "既存作品",
        overview: "",
        posterPath: null,
        releaseDate: "2024-01-01",
        jpWatchPlatforms: [],
        hasJapaneseRelease: true,
      },
    ]);

    const { result } = renderHook(() =>
      useTmdbSearchRequest({
        items: [createItem("stacked-1", "stacked", 10)],
        onResetSelection,
        onSetSearchMessage,
      }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    act(() => {
      result.current.handleQueryChange("既存作品");
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onSetSearchMessage).toHaveBeenCalledWith(
      "すでにストック済みの作品は候補から除外しています。",
    );
  });
});
