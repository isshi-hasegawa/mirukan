import { lazy } from "react";
import { render, screen } from "@testing-library/react";
import { setupTestLifecycle } from "../test/test-lifecycle.ts";
import { LazyViewBoundary } from "./LazyViewBoundary.tsx";

setupTestLifecycle();

describe("LazyViewBoundary", () => {
  test("lazy component の読み込み中は loading fallback を表示する", async () => {
    const DeferredView = lazy(
      () =>
        new Promise<{
          default: () => React.JSX.Element;
        }>(() => {}),
    );

    render(
      <LazyViewBoundary loadingFallback={<div>LOADING</div>}>
        <DeferredView />
      </LazyViewBoundary>,
    );

    expect(screen.getByText("LOADING")).toBeInTheDocument();
  });

  test("描画エラー時は error fallback を表示する", () => {
    const ThrowingView = () => {
      throw new Error("boom");
    };

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <LazyViewBoundary loadingFallback={<div>LOADING</div>} errorFallback={<div>ERROR</div>}>
        <ThrowingView />
      </LazyViewBoundary>,
    );

    expect(screen.getByText("ERROR")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });
});
