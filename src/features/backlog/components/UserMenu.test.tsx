import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { UserMenu } from "./UserMenu.tsx";

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signOut: vi.fn(),
  },
}));

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: supabaseMock,
}));

setupTestLifecycle();

describe("UserMenu", () => {
  const openMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
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

    expect(screen.getByRole("dialog", { name: "みるカンについて" })).toBeInTheDocument();
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

  test("メニューから利用規約を開ける", async () => {
    const user = userEvent.setup();

    render(<UserMenu email="user@example.com" />);

    const trigger = screen.getByRole("button", { name: /user@example.com/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "利用規約" }));

    expect(screen.getByRole("dialog", { name: "利用規約" })).toBeInTheDocument();
    expect(screen.getByText("第6条（禁止事項）")).toBeInTheDocument();
    expect(screen.getByText("第12条（個人情報の取扱い）")).toBeInTheDocument();
  });

  test("メニューからプライバシーポリシーを開ける", async () => {
    const user = userEvent.setup();

    render(<UserMenu email="user@example.com" />);

    const trigger = screen.getByRole("button", { name: /user@example.com/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "プライバシーポリシー" }));

    expect(screen.getByRole("dialog", { name: "プライバシーポリシー" })).toBeInTheDocument();
    expect(screen.getByText("第10条（お問い合わせ窓口）")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "github.com/isshi-hasegawa/mirukan/issues" }),
    ).toHaveAttribute("href", "https://github.com/isshi-hasegawa/mirukan/issues/new/choose");
  });

  test("メニューから GitHub Issues の不具合報告導線を開ける", async () => {
    const user = userEvent.setup();

    render(<UserMenu email="user@example.com" />);

    const trigger = screen.getByRole("button", { name: /user@example.com/i });
    trigger.focus();
    await user.keyboard("{Enter}");
    await user.click(await screen.findByRole("menuitem", { name: "不具合を報告" }));

    expect(openMock).toHaveBeenCalledWith(
      "https://github.com/isshi-hasegawa/mirukan/issues/new/choose",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
