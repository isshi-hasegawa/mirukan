import { act, render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { setupTestLifecycle } from "./test/test-lifecycle.ts";
import { routeTree } from "./App.tsx";

const authState = vi.hoisted(() => ({
  callback: null as ((event: string, session: unknown) => void) | null,
}));

const authRepositoryMock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("./lib/auth-repository.ts", () => authRepositoryMock);

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

vi.mock("./features/backlog/components/PrivacyPolicyPage.tsx", () => ({
  PrivacyPolicyPage: () => <div>PRIVACY_POLICY_PAGE</div>,
}));

vi.mock("./features/backlog/components/TermsOfServicePage.tsx", () => ({
  TermsOfServicePage: () => <div>TERMS_OF_SERVICE_PAGE</div>,
}));

setupTestLifecycle();

function renderApp(path = "/") {
  const testRouter = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={testRouter} />);
}

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.callback = null;
    globalThis.history.replaceState({}, "", "/");

    authRepositoryMock.getSession.mockResolvedValue({ data: { session: null } });
    authRepositoryMock.onAuthStateChange.mockImplementation(
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
    authRepositoryMock.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    globalThis.history.replaceState({}, "", "/#type=recovery&access_token=token");

    renderApp("/");

    expect(await screen.findByText("RESET_PASSWORD_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("BOARD_PAGE")).not.toBeInTheDocument();
  });

  test("recovery パラメータが残っていてもセッションがなければログイン画面を表示する", async () => {
    globalThis.history.replaceState({}, "", "/#type=recovery");

    renderApp("/");

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("RESET_PASSWORD_PAGE")).not.toBeInTheDocument();
  });

  test("SIGNED_IN が先に来る recovery フローでも再設定画面を維持する", async () => {
    globalThis.history.replaceState({}, "", "/?type=recovery");

    renderApp("/");
    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();

    act(() => {
      authState.callback?.("SIGNED_IN", { user: { id: "user-1" } });
    });

    expect(await screen.findByText("RESET_PASSWORD_PAGE")).toBeInTheDocument();
  });

  test("パスワード更新後は recovery パラメータを消して backlog 画面へ戻す", async () => {
    authRepositoryMock.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    globalThis.history.replaceState({}, "", "/?type=recovery");

    renderApp("/");
    expect(await screen.findByText("RESET_PASSWORD_PAGE")).toBeInTheDocument();

    act(() => {
      authState.callback?.("USER_UPDATED", { user: { id: "user-1" } });
    });

    expect(await screen.findByText("BOARD_PAGE")).toBeInTheDocument();
    expect(globalThis.location.search).toBe("");
  });

  test("SIGNED_OUT でも recovery パラメータを消してログイン画面へ戻す", async () => {
    authRepositoryMock.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
    });
    globalThis.history.replaceState({}, "", "/?type=recovery");

    renderApp("/");
    expect(await screen.findByText("RESET_PASSWORD_PAGE")).toBeInTheDocument();

    act(() => {
      authState.callback?.("SIGNED_OUT", null);
    });

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
    expect(globalThis.location.search).toBe("");
  });

  test("getSession が失敗してもローディング状態で止まらずログイン画面に戻る", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authRepositoryMock.getSession.mockRejectedValueOnce(new Error("network error"));

    renderApp("/");

    expect(await screen.findByText("LOGIN_PAGE")).toBeInTheDocument();
    expect(screen.queryByText("LOGIN_LOADING")).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith("セッション取得に失敗しました", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  test("/privacy では認証処理を通さずプライバシーポリシーを表示する", async () => {
    renderApp("/privacy");

    expect(await screen.findByText("PRIVACY_POLICY_PAGE")).toBeInTheDocument();
    expect(authRepositoryMock.getSession).not.toHaveBeenCalled();
  });

  test("/terms では認証処理を通さず利用規約を表示する", async () => {
    renderApp("/terms");

    expect(await screen.findByText("TERMS_OF_SERVICE_PAGE")).toBeInTheDocument();
    expect(authRepositoryMock.getSession).not.toHaveBeenCalled();
  });
});
