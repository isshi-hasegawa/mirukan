import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { UserMenu } from "./UserMenu.tsx";

const authRepositoryMock = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock("../../../lib/auth-repository.ts", () => authRepositoryMock);

setupTestLifecycle();

describe("UserMenu", () => {
  const openMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authRepositoryMock.signOut.mockResolvedValue({ error: null });
    vi.stubGlobal("open", openMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("About からアプリの説明と TMDB attribution を確認できる", async () => {
    const user = userEvent.setup();

    render(<UserMenu email="user@example.com" />);

    const trigger = screen.getByRole("button", { name: /user@example.com/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "About" }));

    expect(await screen.findByRole("dialog", { name: "みるカンについて" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "みるカンは、積んだ映画やシリーズから次に見る一本を決めるための映像作品バックログです。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("候補を積む")).toBeInTheDocument();
    expect(screen.getByText("次の一本を決める")).toBeInTheDocument();
    expect(
      screen.getByText("This product uses the TMDB API but is not endorsed or certified by TMDB."),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "TMDB" })).toBeInTheDocument();
  });

  test("メニューから利用規約ページを新しいタブで開ける", async () => {
    const user = userEvent.setup();

    render(<UserMenu email="user@example.com" />);

    const trigger = screen.getByRole("button", { name: /user@example.com/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "利用規約" }));

    await waitFor(() =>
      expect(openMock).toHaveBeenCalledWith("/terms", "_blank", "noopener,noreferrer"),
    );
  });

  test("メニューからプライバシーポリシーページを新しいタブで開ける", async () => {
    const user = userEvent.setup();

    render(<UserMenu email="user@example.com" />);

    const trigger = screen.getByRole("button", { name: /user@example.com/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "プライバシーポリシー" }));

    await waitFor(() =>
      expect(openMock).toHaveBeenCalledWith("/privacy", "_blank", "noopener,noreferrer"),
    );
  });

  test("お問い合わせからメールと GitHub Issues の導線を確認できる", async () => {
    const user = userEvent.setup();

    render(<UserMenu email="user@example.com" />);

    const trigger = screen.getByRole("button", { name: /user@example.com/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "お問い合わせ" }));

    expect(await screen.findByRole("dialog", { name: "お問い合わせ" })).toBeInTheDocument();
    expect(screen.getByText("support@mirukan.app")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "メールアドレスをコピー" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /github\.com\/isshi-hasegawa\/mirukan\/issues/ }),
    ).toHaveAttribute("href", "https://github.com/isshi-hasegawa/mirukan/issues/new/choose");
  });
});
