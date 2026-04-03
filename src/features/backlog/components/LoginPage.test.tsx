import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { LoginPage } from "./LoginPage.tsx";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
  },
}));

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: supabaseMock,
}));

setupTestLifecycle();

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
  });

  test("ブランドロゴと説明を表示する", () => {
    render(<LoginPage />);

    expect(screen.getAllByText("みるカン")).toHaveLength(1);
    expect(screen.getByAltText("みるカンのシンボル")).toBeInTheDocument();
    expect(screen.getByText("mirukan")).toBeInTheDocument();
    expect(
      screen.getByText(
        "みるカンは、その時の自分に合う 1 本を決めるための、映像作品のバックログ兼意思決定アプリです",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("akari@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("LOCAL AUTH")).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "ログイン" }));

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

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByText("ログインに失敗しました: Invalid login credentials"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeEnabled();
    expect(screen.getByLabelText("メールアドレス")).toBeEnabled();
  });

  test("セッション確認中はログイン画面と同系統のローディング表示を出す", () => {
    render(<LoginPage isSessionLoading />);

    expect(screen.getByText("みるカン")).toBeInTheDocument();
    expect(screen.getByText("セッション確認中")).toBeInTheDocument();
    expect(screen.getByText("セッションを確認しています...")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ログイン" }),
    ).not.toBeInTheDocument();
  });
});
