import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { Header } from "./Header.tsx";

setupTestLifecycle();

vi.mock("./BrandWordmark.tsx", () => ({
  BrandWordmark: ({ className }: { className?: string }) => (
    <div data-testid="brand-wordmark" className={className}>
      みるカン
    </div>
  ),
}));

vi.mock("./UserMenu.tsx", () => ({
  UserMenu: ({ email }: { email: string | null | undefined }) => <div>{email}</div>,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("Header", () => {
  test("カード風の囲み装飾なしでブランドとユーザーメニューを表示する", () => {
    const { container } = render(
      <Header session={{ user: { email: "test@example.com" } } as never} boardMode="video" />,
    );

    expect(screen.getByTestId("brand-wordmark")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "映像" })).toHaveAttribute("href", "/video");
    expect(screen.getByRole("link", { name: "ゲーム" })).toHaveAttribute("href", "/game");

    const header = container.querySelector("header");
    expect(header).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto]");
    expect(header).not.toHaveClass(
      "border",
      "bg-[rgba(28,28,28,0.95)]",
      "backdrop-blur-xl",
      "shadow-[0_24px_60px_rgba(0,0,0,0.5)]",
      "rounded-[28px]",
    );
  });
});
