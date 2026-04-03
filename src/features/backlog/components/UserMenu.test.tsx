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
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
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
});
