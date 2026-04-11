import { renderHook, act } from "@testing-library/react";
import { useWindowSize } from "./useWindowSize.ts";

describe("useWindowSize", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("初期値として globalThis.innerWidth を返す", () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toBe(1280);
  });

  test("resize イベントは throttle 後に最新幅へ更新される", () => {
    const { result } = renderHook(() => useWindowSize());

    act(() => {
      Object.defineProperty(globalThis, "innerWidth", {
        writable: true,
        configurable: true,
        value: 390,
      });
      globalThis.dispatchEvent(new Event("resize"));

      Object.defineProperty(globalThis, "innerWidth", {
        writable: true,
        configurable: true,
        value: 420,
      });
      globalThis.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(1280);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(420);
  });

  test("アンマウント後は resize リスナーが除去される", () => {
    const spy = vi.spyOn(globalThis, "removeEventListener");
    const { unmount } = renderHook(() => useWindowSize());

    unmount();

    expect(spy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
