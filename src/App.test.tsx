import { act, render, screen } from "@testing-library/react";
import { setupTestLifecycle } from "./test/test-lifecycle.ts";
import { App } from "./App.tsx";

const authState = vi.hoisted(() => ({
  callback: null as ((event: string, session: unknown) => void) | null,
}));

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
}));

vi.mock("./lib/supabase.ts", () => ({
  supabase: supabaseMock,
}));

vi.mock("./features/backlog/components/LoginPage.tsx", () => ({
  LoginPage: ({ isSessionLoading = false }: { isSessionLoading?: boolean }) => (
    <div>{isSessionLoading ? "LOGIN_LOADING" : "LOGIN_PAGE"}</div>
  ),
}));

vi.mock("./features/backlog/components/BoardPage.tsx", () => ({
  BoardPage: () => <div>BOARD_PAGE</div>,
}));

vi.mock("./features/backlog/components/ResetPasswordPage.tsx", () => ({
  ResetPasswordPage: () => <div>RESET_PASSWORD_PAGE</div>,
}));

setupTestLifecycle();

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.callback = null;
    window.history.replaceState({}, "", "/");

    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabaseMock.auth.onAuthStateChange.mockImplementation(
      (callback: (event: string, session: unknown) => void) => {
        authState.callback = callback;

        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
    );
  });

  test("recovery リンク経由でセッションが復元されたら再設定画面を優先する", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    window.history.replaceState({}, "", "/#type=recovery&access_token=token");

    render(<App />);

    expect(await screen.findByText("RESET_PASSWORD_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("BOARD_PAGE")).not.toBeInTheDocument();
  });

  test("recovery パラメータが残っていてもセッションがなければログイン画面を表示する", async () => {
    window.history.replaceState({}, "", "/#type=recovery");

    render(<App />);

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("RESET_PASSWORD_PAGE")).not.toBeInTheDocument();
  });

  test("SIGNED_IN が先に来る recovery フローでも再設定画面を維持する", async () => {
    window.history.replaceState({}, "", "/?type=recovery");

    render(<App />);
    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();

    act(() => {
      authState.callback?.("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(await screen.findByText("RESET_PASSWORD_PAGE")).toBeInTheDocument();
  });

  test("パスワード更新後は recovery パラメータを消して backlog 画面へ戻す", async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    window.history.replaceState({}, "", "/?type=recovery");

    render(<App />);
    expect(await screen.findByText("RESET_PASSWORD_PAGE")).toBeInTheDocument();

    act(() => {
      authState.callback?.("USER_UPDATED", { user: { id: "user-1" } });
    });

    expect(await screen.findByText("BOARD_PAGE")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  test("getSession が失敗してもローディング状態で止まらずログイン画面に戻る", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    supabaseMock.auth.getSession.mockRejectedValueOnce(new Error("network error"));

    render(<App />);

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("LOGIN_LOADING")).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith("セッション取得に失敗しました", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});
