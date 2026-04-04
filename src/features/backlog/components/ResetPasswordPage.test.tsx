import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { ResetPasswordPage } from "./ResetPasswordPage.tsx";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    updateUser: vi.fn(),
  },
}));

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: supabaseMock,
}));

setupTestLifecycle();

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.updateUser.mockResolvedValue({ error: null });
  });

  test("新しいパスワードと確認用パスワードのフォームを表示する", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByText("パスワードの再設定")).toBeInTheDocument();
    expect(screen.getByLabelText("新しいパスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("確認用パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "パスワードを更新する" })).toBeInTheDocument();
  });

  test("パスワードを更新できる", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("新しいパスワード"), "newpassword123");
    await user.type(screen.getByLabelText("確認用パスワード"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "パスワードを更新する" }));

    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({ password: "newpassword123" });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "パスワードを更新する" })).toBeEnabled(),
    );
  });

  test("確認用パスワードが一致しない場合はエラーを表示する", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("新しいパスワード"), "newpassword123");
    await user.type(screen.getByLabelText("確認用パスワード"), "differentpassword");
    await user.click(screen.getByRole("button", { name: "パスワードを更新する" }));

    expect(await screen.findByText("確認用パスワードが一致しません。")).toBeInTheDocument();
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  test("更新失敗時はエラーメッセージを表示する", async () => {
    const user = userEvent.setup();

    supabaseMock.auth.updateUser.mockResolvedValue({
      error: { message: "Password should be at least 6 characters" },
    });

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("新しいパスワード"), "abc");
    await user.type(screen.getByLabelText("確認用パスワード"), "abc");
    await user.click(screen.getByRole("button", { name: "パスワードを更新する" }));

    expect(
      await screen.findByText("パスワードの更新に失敗しました。再度お試しください。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "パスワードを更新する" })).toBeEnabled();
  });

  test("送信中はボタンと入力を無効化する", async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((value: { error: null }) => void) | undefined;

    supabaseMock.auth.updateUser.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("新しいパスワード"), "newpassword123");
    await user.type(screen.getByLabelText("確認用パスワード"), "newpassword123");
    await user.click(screen.getByRole("button", { name: "パスワードを更新する" }));

    expect(screen.getByRole("button", { name: "更新しています..." })).toBeDisabled();
    expect(screen.getByLabelText("新しいパスワード")).toBeDisabled();
    expect(screen.getByLabelText("確認用パスワード")).toBeDisabled();

    resolveUpdate?.({ error: null });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "パスワードを更新する" })).toBeEnabled(),
    );
  });
});
