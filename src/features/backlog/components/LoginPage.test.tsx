import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { LoginPage } from "./LoginPage.tsx";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
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
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: "user-1" } },
      error: null,
    });
  });

  test("ブランドロゴと説明を表示する", () => {
    render(<LoginPage />);

    expect(screen.getAllByText("みるカン")).toHaveLength(1);
    expect(screen.getByAltText("みるカンのシンボル")).toBeInTheDocument();
    expect(screen.getByText("mirukan")).toBeInTheDocument();
    expect(screen.getByText("次に見る一本を、ちゃんと決める。")).toBeInTheDocument();
    expect(
      screen.getByText(
        "みるカンは、積んだ映画やシリーズを整理して、いま見る候補を決めるための映像作品バックログです。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("akari@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("LOCAL AUTH")).not.toBeInTheDocument();
  });

  test("送信中は入力と送信を無効化し、完了後に再入力できる", async () => {
    const user = userEvent.setup();
    let resolveSignIn: ((value: { error: null }) => void) | undefined;

    supabaseMock.auth.signInWithPassword.mockImplementation(
      () =>
        new Promise<{ error: null }>((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    render(<LoginPage />);

    await user.click(screen.getByText("ログイン", { selector: "button[type='submit']" }));

    expect(screen.getByRole("button", { name: "ログインしています..." })).toBeDisabled();
    expect(screen.getByLabelText("メールアドレス")).toBeDisabled();
    expect(screen.getByLabelText("パスワード")).toBeDisabled();

    resolveSignIn?.({ error: null });

    await waitFor(() =>
      expect(screen.getByText("ログイン", { selector: "button[type='submit']" })).toBeEnabled(),
    );
    expect(screen.queryByText("ログインに成功しました。")).not.toBeInTheDocument();
  });

  test("認証失敗時はエラーメッセージを表示して再入力できる", async () => {
    const user = userEvent.setup();

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    render(<LoginPage />);

    await user.click(screen.getByText("ログイン", { selector: "button[type='submit']" }));

    expect(
      await screen.findByText("ログインに失敗しました: Invalid login credentials"),
    ).toBeInTheDocument();
    expect(screen.getByText("ログイン", { selector: "button[type='submit']" })).toBeEnabled();
    expect(screen.getByLabelText("メールアドレス")).toBeEnabled();
  });

  test("新規登録では確認待ち状態に切り替える", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    await user.type(screen.getByLabelText("メールアドレス"), "new-user@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password456");
    await user.type(screen.getByLabelText("確認用パスワード"), "password456");
    await user.click(screen.getByRole("button", { name: "確認メールを送信して登録" }));

    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: "new-user@example.com",
      password: "password456",
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    expect(await screen.findByText("確認メールを送信しました")).toBeInTheDocument();
    expect(
      screen.getByText(
        "new-user@example.com 宛てに確認メールを送りました。メール内のリンクから登録を完了してください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログインへ戻る" })).toBeInTheDocument();
  });

  test("新規登録で確認用パスワードが不一致なら送信しない", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));
    await user.type(screen.getByLabelText("メールアドレス"), "new-user@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password456");
    await user.type(screen.getByLabelText("確認用パスワード"), "password789");
    await user.click(screen.getByRole("button", { name: "確認メールを送信して登録" }));

    expect(await screen.findByText("確認用パスワードが一致しません。")).toBeInTheDocument();
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled();
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
