import { act, fireEvent, render, screen } from "@testing-library/react";
import { ContactDialog } from "./ContactDialog.tsx";

describe("ContactDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("問い合わせ先と不具合報告先を表示する", () => {
    render(<ContactDialog onClose={vi.fn()} />);

    expect(screen.getByText("support@mirukan.app")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /github\.com\/isshi-hasegawa\/mirukan\/issues/i }),
    ).toHaveAttribute("href", "https://github.com/isshi-hasegawa/mirukan/issues/new/choose");
  }, 15_000);

  test("メールアドレスをコピーできる", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });

    render(<ContactDialog onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "メールアドレスをコピー" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith("support@mirukan.app");
    expect(screen.getByRole("button", { name: "コピーしました" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole("button", { name: "メールアドレスをコピー" })).toBeInTheDocument();

    vi.useRealTimers();
  });

  test("クリップボード API が拒否されても閉じずに継続できる", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });

    render(<ContactDialog onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "メールアドレスをコピー" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "メールアドレスをコピー" })).toBeInTheDocument();
  });
});
