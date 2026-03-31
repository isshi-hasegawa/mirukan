import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { LoginPage } from "./LoginPage.tsx";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
  },
}));

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: supabaseMock,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
  });

  test("ローカル開発用アカウントを補助情報として折りたたんで表示する", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    expect(screen.queryByText("akari@example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ローカル開発用アカウントを表示" }));

    expect(screen.getByText("akari@example.com")).toBeInTheDocument();
    expect(screen.getByText("password123")).toBeInTheDocument();
  });

  test("送信中は入力と送信を無効化し、成功メッセージを表示する", async () => {
    const user = userEvent.setup();
    let resolveSignIn: ((value: { error: null }) => void) | undefined;

    supabaseMock.auth.signInWithPassword.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "ログインして backlog を見る" }));

    expect(screen.getByRole("button", { name: "ログインしています..." })).toBeDisabled();
    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("パスワード")).toBeDisabled();
    expect(screen.getByText("ログインしています...", { selector: "p" })).toBeInTheDocument();

    resolveSignIn?.({ error: null });

    await waitFor(() => expect(screen.getByText("ログインに成功しました。")).toBeInTheDocument());
  });

  test("認証失敗時はエラーメッセージを表示して再入力できる", async () => {
    const user = userEvent.setup();

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "ログインして backlog を見る" }));

    expect(
      await screen.findByText("ログインに失敗しました: Invalid login credentials"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログインして backlog を見る" })).toBeEnabled();
    expect(screen.getByLabelText("メールアドレス")).toBeEnabled();
  });

  test("セッション確認中はログイン画面と同系統のローディング表示を出す", () => {
    render(<LoginPage isSessionLoading />);

    expect(screen.getByText("セッション確認中")).toBeInTheDocument();
    expect(screen.getByText("セッションを確認しています...")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ログインして backlog を見る" }),
    ).not.toBeInTheDocument();
  });
});
