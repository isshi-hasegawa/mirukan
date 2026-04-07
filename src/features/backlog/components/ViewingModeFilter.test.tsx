import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { ViewingModeFilter } from "./ViewingModeFilter.tsx";

setupTestLifecycle();

describe("ViewingModeFilter", () => {
  test("絞り込みカードを表示する", () => {
    render(<ViewingModeFilter activeViewingMode="thoughtful" onViewingModeToggle={vi.fn()} />);

    expect(screen.getByRole("group", { name: "おすすめの絞り込み" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ガッツリ/ })).toHaveTextContent(
      "ガッツリ集中して一本見たい",
    );
    expect(screen.getByRole("button", { name: /じっくり/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /サクッと/ })).toHaveTextContent(
      "サクッと短時間でテンポよく",
    );
    expect(screen.getByRole("button", { name: /のんびり/ })).toHaveTextContent(
      "のんびり流し見や作業のおともに",
    );
  });

  test("カード押下で toggle handler を呼ぶ", async () => {
    const user = userEvent.setup();
    const onViewingModeToggle = vi.fn();

    render(
      <ViewingModeFilter activeViewingMode={null} onViewingModeToggle={onViewingModeToggle} />,
    );

    await user.click(screen.getByRole("button", { name: /サクッと/ }));

    expect(onViewingModeToggle).toHaveBeenCalledWith("quick");
  });
});
