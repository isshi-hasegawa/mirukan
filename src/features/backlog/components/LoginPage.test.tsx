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
    render(<LoginPage showDevLoginHint={false} />);

    expect(screen.getAllByText("みるカン")).toHaveLength(1);
    expect(screen.getByAltText("みるカンのシンボル")).toBeInTheDocument();
    expect(screen.getByText("mirukan")).toBeInTheDocument();
    expect(screen.getByText("次に見る一本を、決める。")).toBeInTheDocument();
    expect(
      screen.getByText("みるカンは、積んだ映画やシリーズを整理して、次に何を見るか決めるアプリです。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "利用規約を確認する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "プライバシーポリシーを確認する" })).toBeInTheDocument();
    expect(screen.queryByText("akari@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("LOCAL AUTH")).not.toBeInTheDocument();
  });

  test("開発時だけ補助導線から開発用アカウントを入力できる", async () => {
    const user = userEvent.setup();

    render(<LoginPage showDevLoginHint />);

    expect(screen.getByText("開発用アカウント")).toBeInTheDocument();
    expect(screen.getByText("akari@example.com / password123")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("");
    expect(screen.getByLabelText("パスワード")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "開発用アカウントを入力する" }));

    expect(screen.getByLabelText("メールアドレス")).toHaveValue("akari@example.com");
    expect(screen.getByLabelText("パスワード")).toHaveValue("password123");
  });

  test("ログイン画面から利用規約を開ける", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "利用規約を確認する" }));

    expect(screen.getByRole("dialog", { name: "利用規約" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "この利用規約（以下「本規約」といいます。）は、個人開発サービスである「みるカン」の利用条件を定めるものです。ユーザーは、本規約に同意した上で本サービスを利用するものとします。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("第2条（運営者）")).toBeInTheDocument();
  });

  test("ログイン画面からプライバシーポリシーを開ける", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "プライバシーポリシーを確認する" }));

    expect(screen.getByRole("dialog", { name: "プライバシーポリシー" })).toBeInTheDocument();
    expect(screen.getByText("第2条（取得する情報）")).toBeInTheDocument();
    expect(screen.getByText("Supabase: 認証、データ保存、Edge Functions 実行のため")).toBeInTheDocument();
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

    await user.type(screen.getByLabelText("メールアドレス"), "akari@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");

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

    await user.type(screen.getByLabelText("メールアドレス"), "akari@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");

    await user.click(screen.getByText("ログイン", { selector: "button[type='submit']" }));

    expect(
      await screen.findByText("メールアドレスまたはパスワードが正しくありません。"),
    ).toBeInTheDocument();
    expect(screen.getByText("ログイン", { selector: "button[type='submit']" })).toBeEnabled();
    expect(screen.getByLabelText("メールアドレス")).toBeEnabled();
  });

  test("確認メール未完了の認証失敗は案内付き文言を表示する", async () => {
    const user = userEvent.setup();

    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Email not confirmed" },
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "akari@example.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByText("ログイン", { selector: "button[type='submit']" }));

    expect(
      await screen.findByText(
        "メールアドレスの確認が完了していません。確認メールのリンクを開いてからログインしてください。",
      ),
    ).toBeInTheDocument();
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
      screen.getByText("保存済みのログイン状態を確認しています。画面の準備ができるまで、このままお待ちください。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "ログイン" }),
    ).not.toBeInTheDocument();
  });
});
