import { render, screen } from "@testing-library/react";
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

describe("Header", () => {
  test("カード風の囲み装飾なしでブランドとユーザーメニューを表示する", () => {
    const { container } = render(
      <Header session={{ user: { email: "test@example.com" } } as never} />,
    );

    expect(screen.getByTestId("brand-wordmark")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

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
