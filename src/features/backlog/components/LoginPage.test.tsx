import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { getAuthRedirectUrl, LoginPage } from "./LoginPage.tsx";

const authRepositoryMock = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("../../../lib/auth-repository.ts", () => authRepositoryMock);

setupTestLifecycle();

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.history.replaceState({}, "", "/");
    authRepositoryMock.signInWithPassword.mockResolvedValue({ error: null });
    authRepositoryMock.signUp.mockResolvedValue({
      data: { session: null, user: { id: "user-1" } },
      error: null,
    });
    authRepositoryMock.resetPasswordForEmail.mockResolvedValue({ error: null });
    authRepositoryMock.signInWithOAuth.mockResolvedValue({ error: null });
  });

  test("ブランドロゴと説明を表示する", () => {
    render(<LoginPage showDevLoginHint={false} />);

    expect(screen.getAllByText("みるカン")).toHaveLength(1);
    expect(screen.getByAltText("みるカンのシンボル")).toBeInTheDocument();
    expect(screen.getByText("mirukan")).toBeInTheDocument();
    expect(screen.getByText("次に見る一本を、決める。")).toBeInTheDocument();
    expect(
      screen.getByText(
        "みるカンは、積んだ映画やシリーズを整理して、次に何を見るか決めるアプリです。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "利用規約" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "プライバシーポリシー" })).toBeInTheDocument();
    expect(screen.queryByText("akari@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("LOCAL AUTH")).not.toBeInTheDocument();
  });

  test("開発時だけ補助導線から開発用アカウントを入力できる", async () => {
    const user = userEvent.setup();

    render(
      <LoginPage
        showDevLoginHint
        devLoginCredentials={{ email: "akari@example.com", password: "password123" }}
      />,
    );

    expect(screen.getByText("開発用アカウント")).toBeInTheDocument();
    expect(screen.getByText("akari@example.com / password123")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("");
    expect(screen.getByLabelText("パスワード")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "開発用アカウントを入力する" }));

    expect(screen.getByLabelText("メールアドレス")).toHaveValue("akari@example.com");
    expect(screen.getByLabelText("パスワード")).toHaveValue("password123");
  });

  test.each([
    ["利用規約", "/terms"],
    ["プライバシーポリシー", "/privacy"],
  ])("ログイン画面に %s リンクが表示される", (name, href) => {
    render(<LoginPage />);

    const links = screen.getAllByRole("link", { name });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
    }
  });

  test("ログイン画面のお問い合わせからモーダルを開ける", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "お問い合わせ" }));

    expect(
      await screen.findByRole("dialog", { name: "お問い合わせ" }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  test("送信中は入力と送信を無効化し、完了後に再入力できる", async () => {
    const user = userEvent.setup();
    let resolveSignIn: ((value: { error: null }) => void) | undefined;

    authRepositoryMock.signInWithPassword.mockImplementation(
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

    authRepositoryMock.signInWithPassword.mockResolvedValue({
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

    authRepositoryMock.signInWithPassword.mockResolvedValue({
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

    expect(authRepositoryMock.signUp).toHaveBeenCalledWith("new-user@example.com", "password456", {
      emailRedirectTo: globalThis.location.origin,
    });
    expect(await screen.findByText("確認メールを送信しました")).toBeInTheDocument();
    expect(
      screen.getByText(
        "new-user@example.com 宛てに確認メールを送信しました。メール内のリンクを開いて、アカウント登録を完了してください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログインへ戻る" })).toBeInTheDocument();
  });

  test("新規登録では確認メール送信前の案内と同意文言を表示する", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));

    expect(
      screen.getByText("確認メールのリンクを開くと、アカウント登録が完了します。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.textContent ===
          "登録することで、 利用規約 および プライバシーポリシー に同意したものとみなします。",
      ),
    ).toBeInTheDocument();
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
    expect(authRepositoryMock.signUp).not.toHaveBeenCalled();
  });

  test("ログイン画面からパスワードを忘れた場合の画面に遷移できる", async () => {
    const user = userEvent.setup();

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }));

    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "リセットメールを送信" })).toBeInTheDocument();
    expect(screen.queryByLabelText("パスワード")).not.toBeInTheDocument();
  });

  test("パスワードリセットメールを送信できる", async () => {
    const user = userEvent.setup();

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }));
    await user.type(screen.getByLabelText("メールアドレス"), "akari@example.com");
    await user.click(screen.getByRole("button", { name: "リセットメールを送信" }));

    expect(authRepositoryMock.resetPasswordForEmail).toHaveBeenCalledWith("akari@example.com", {
      redirectTo: globalThis.location.origin,
    });
    expect(await screen.findByText("リセットメールを送信しました")).toBeInTheDocument();
    expect(
      screen.getByText(
        "akari@example.com 宛てにパスワードリセット用のリンクを送信しました。メール内のリンクを開いて、パスワードを再設定してください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ログインへ戻る" })).toBeInTheDocument();
  });

  test("パスワードリセット送信後にログインへ戻るとログイン画面に遷移する", async () => {
    const user = userEvent.setup();

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }));
    await user.type(screen.getByLabelText("メールアドレス"), "akari@example.com");
    await user.click(screen.getByRole("button", { name: "リセットメールを送信" }));
    await screen.findByText("リセットメールを送信しました");

    await user.click(screen.getByRole("button", { name: "ログインへ戻る" }));

    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("akari@example.com");
  });

  test("www ドメインでは canonical な本番 URL を返す", () => {
    expect(
      getAuthRedirectUrl({
        origin: "https://www.mirukan.app",
        hostname: "www.mirukan.app",
      }),
    ).toBe("https://mirukan.app");
  });

  test("それ以外のドメインでは現在の origin を返す", () => {
    expect(
      getAuthRedirectUrl({
        origin: "https://mirukan-git-main.vercel.app",
        hostname: "mirukan-git-main.vercel.app",
      }),
    ).toBe("https://mirukan-git-main.vercel.app");
  });

  test("redirect URL 不一致の失敗は設定起因の文言を表示する", async () => {
    const user = userEvent.setup();

    authRepositoryMock.resetPasswordForEmail.mockResolvedValue({
      error: { message: "Redirect URL not allowed" },
    });

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }));
    await user.type(screen.getByLabelText("メールアドレス"), "akari@example.com");
    await user.click(screen.getByRole("button", { name: "リセットメールを送信" }));

    expect(
      await screen.findByText(
        "パスワード再設定メールの送信設定に問題があります。お手数ですが時間をおいて再度お試しください。",
      ),
    ).toBeInTheDocument();
  });

  test("セッション確認中はログイン画面と同系統のローディング表示を出す", () => {
    render(<LoginPage isSessionLoading />);

    expect(screen.getByText("みるカン")).toBeInTheDocument();
    expect(screen.getByText("セッション確認中")).toBeInTheDocument();
    expect(screen.getByText("セッションを確認しています...")).toBeInTheDocument();
    expect(
      screen.getByText(
        "保存済みのログイン状態を確認しています。画面の準備ができるまで、このままお待ちください。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ログイン" })).not.toBeInTheDocument();
  });

  test("ログイン画面に Google ログインボタンを表示する", () => {
    render(<LoginPage showDevLoginHint={false} />);

    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
  });

  test("新規登録画面にも Google ログインボタンを表示する", async () => {
    const user = userEvent.setup();

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "新規登録" }));

    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
  });

  test("Google ログインボタンをクリックすると signInWithOAuth を呼び出す", async () => {
    const user = userEvent.setup();

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    expect(authRepositoryMock.signInWithOAuth).toHaveBeenCalledWith({
      redirectTo: globalThis.location.origin,
    });
  });

  test("Google ログイン失敗時はエラーメッセージを表示する", async () => {
    const user = userEvent.setup();

    authRepositoryMock.signInWithOAuth.mockResolvedValue({
      error: { message: "OAuth error" },
    });

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    expect(
      await screen.findByText("Googleログインに失敗しました。再度お試しください。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeEnabled();
  });

  test("パスワードリセット画面では Google ログインボタンを表示しない", async () => {
    const user = userEvent.setup();

    render(<LoginPage showDevLoginHint={false} />);

    await user.click(screen.getByRole("button", { name: "パスワードを忘れた場合" }));

    expect(screen.queryByRole("button", { name: "Googleでログイン" })).not.toBeInTheDocument();
  });
});
