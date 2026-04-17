import { act, fireEvent, render, screen } from "@testing-library/react";
import { useBacklogFeedback } from "./useBacklogFeedback.tsx";

function settleFeedback<T>(result: T | Promise<T>) {
  Promise.resolve(result).catch(() => undefined);
}

function FeedbackHarness() {
  const { feedback, feedbackUi } = useBacklogFeedback();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          settleFeedback(feedback.alert("通知メッセージ"));
        }}
      >
        alert
      </button>
      <button
        type="button"
        onClick={() => {
          settleFeedback(feedback.confirm("本当に続けますか?"));
        }}
      >
        confirm
      </button>
      <button
        type="button"
        onClick={() => {
          settleFeedback(
            feedback.toast("保存しました", { undoLabel: "元に戻す", timeoutMs: 1000 }),
          );
        }}
      >
        toast
      </button>
      <button
        type="button"
        onClick={() => {
          settleFeedback(feedback.toast("別の保存", { timeoutMs: 1000 }));
        }}
      >
        replace toast
      </button>
      {feedbackUi}
    </>
  );
}

describe("useBacklogFeedback", () => {
  test("alert を表示して閉じられる", async () => {
    render(<FeedbackHarness />);

    fireEvent.click(screen.getByRole("button", { name: "alert" }));
    expect(screen.getByText("通知メッセージ")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByText("通知メッセージ")).not.toBeInTheDocument();
  });

  test("confirm の結果をボタン操作で解決する", async () => {
    const resolver = vi.fn();

    function ConfirmHarness() {
      const { feedback, feedbackUi } = useBacklogFeedback();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              Promise.resolve(feedback.confirm("本当に続けますか?")).then(resolver);
            }}
          >
            open confirm
          </button>
          {feedbackUi}
        </>
      );
    }

    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole("button", { name: "open confirm" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "続ける" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(resolver).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("toast は undo と自動 close を処理し、置き換え時に前の promise を解決する", async () => {
    vi.useFakeTimers();
    const firstResolver = vi.fn();
    const secondResolver = vi.fn();

    function ToastHarness() {
      const { feedback, feedbackUi } = useBacklogFeedback();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              Promise.resolve(
                feedback.toast("保存しました", { undoLabel: "元に戻す", timeoutMs: 1000 }),
              ).then(firstResolver);
            }}
          >
            open first toast
          </button>
          <button
            type="button"
            onClick={() => {
              Promise.resolve(feedback.toast("次の保存", { timeoutMs: 1000 })).then(secondResolver);
            }}
          >
            open second toast
          </button>
          {feedbackUi}
        </>
      );
    }

    render(<ToastHarness />);
    fireEvent.click(screen.getByRole("button", { name: "open first toast" }));
    expect(screen.getByText("保存しました")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "open second toast" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(firstResolver).toHaveBeenCalledWith({ undone: false });
    expect(screen.getByText("次の保存")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(secondResolver).toHaveBeenCalledWith({ undone: false });

    const view = render(<FeedbackHarness />);
    fireEvent.click(screen.getByRole("button", { name: "toast" }));
    fireEvent.click(screen.getByRole("button", { name: "元に戻す" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText("保存しました")).not.toBeInTheDocument();
    view.unmount();

    vi.useRealTimers();
  });

  test("confirm をキャンセルで閉じると false を返す", async () => {
    const resolver = vi.fn();

    function CancelHarness() {
      const { feedback, feedbackUi } = useBacklogFeedback();
      return (
        <>
          <button
            type="button"
            onClick={() => {
              Promise.resolve(feedback.confirm("確認")).then(resolver);
            }}
          >
            open confirm
          </button>
          {feedbackUi}
        </>
      );
    }

    render(<CancelHarness />);
    fireEvent.click(screen.getByRole("button", { name: "open confirm" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(resolver).toHaveBeenCalledWith(false);
  });
});
