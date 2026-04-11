import { act, render } from "@testing-library/react";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogFeedback } from "../ui-feedback.ts";
import { useBacklogFeedback } from "./useBacklogFeedback.tsx";

setupTestLifecycle();

let latestFeedback: BacklogFeedback | null = null;

function HookHarness({ renderKey }: Readonly<{ renderKey: number }>) {
  const { feedback, feedbackUi } = useBacklogFeedback();
  latestFeedback = feedback;

  return (
    <div data-testid={`render-${renderKey}`}>
      <span>{renderKey}</span>
      {feedbackUi}
    </div>
  );
}

describe("useBacklogFeedback", () => {
  beforeEach(() => {
    latestFeedback = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("toast の auto close は rerender しても durationMs から延長されない", () => {
    const onClose = vi.fn();
    const { rerender } = render(<HookHarness renderKey={0} />);

    act(() => {
      latestFeedback?.toast({
        message: "削除しました",
        durationMs: 5000,
        onClose,
      });
    });

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    rerender(<HookHarness renderKey={1} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("unmount 時は未確定 toast の onClose を flush する", () => {
    const onClose = vi.fn();
    const { unmount } = render(<HookHarness renderKey={0} />);

    act(() => {
      latestFeedback?.toast({
        message: "削除しました",
        durationMs: 5000,
        onClose,
      });
    });

    unmount();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
