import { act } from "@testing-library/react";
import { browserBacklogFeedback } from "./ui-feedback.ts";

describe("browserBacklogFeedback", () => {
  test("alert と confirm をブラウザ API に委譲する", async () => {
    const alertSpy = vi.spyOn(globalThis, "alert").mockImplementation(() => {});
    const confirmSpy = vi.spyOn(globalThis, "confirm").mockReturnValue(true);

    await browserBacklogFeedback.alert("通知");
    const confirmed = await browserBacklogFeedback.confirm("確認");

    expect(alertSpy).toHaveBeenCalledWith("通知");
    expect(confirmSpy).toHaveBeenCalledWith("確認");
    expect(confirmed).toBe(true);
  });

  test("toast は指定時間の経過後に未 undo として解決する", async () => {
    vi.useFakeTimers();

    const resultPromise = browserBacklogFeedback.toast("保存しました", { timeoutMs: 1200 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1199);
    });
    await expect(Promise.race([resultPromise, Promise.resolve("pending")])).resolves.toBe(
      "pending",
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    await expect(resultPromise).resolves.toEqual({ undone: false });

    vi.useRealTimers();
  });
});
