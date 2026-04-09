import { renderHook, act } from "@testing-library/react";
import { useWindowSize } from "./useWindowSize.ts";

describe("useWindowSize", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  test("初期値として window.innerWidth を返す", () => {
    const { result } = renderHook(() => useWindowSize());
    expect(result.current).toBe(1280);
  });

  test("resize イベントで幅が更新される", () => {
    const { result } = renderHook(() => useWindowSize());

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 390,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(390);
  });

  test("アンマウント後は resize リスナーが除去される", () => {
    const spy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useWindowSize());

    unmount();

    expect(spy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
