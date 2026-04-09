import { renderHook, act } from "@testing-library/react";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
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
});
