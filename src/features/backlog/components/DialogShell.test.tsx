import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialogShell } from "./DialogShell.tsx";

describe("DialogShell", () => {
  test("ポータル経由でダイアログを描画し、閉じる操作を受け付ける", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DialogShell
        titleId="dialog-title"
        badge="Contact"
        title="お問い合わせ"
        closeLabel="閉じる"
        onClose={onClose}
      >
        <p>本文</p>
      </DialogShell>,
    );

    expect(screen.getByRole("dialog", { name: "お問い合わせ" })).toBeInTheDocument();
    expect(screen.getByText("本文")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "閉じる" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Escape と backdrop click でも閉じる", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <DialogShell
        titleId="dialog-title"
        badge="Contact"
        title="お問い合わせ"
        closeLabel="閉じる"
        onClose={onClose}
      >
        <p>本文</p>
      </DialogShell>,
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = document.querySelector('button[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
