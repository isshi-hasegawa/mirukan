import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { KanbanColumnHeader } from "./KanbanColumnHeader.tsx";

setupTestLifecycle();

describe("KanbanColumnHeader", () => {
  test("件数を表示し、stacked では追加ボタンを表示する", () => {
    render(
      <KanbanColumnHeader
        boardMode="video"
        status="stacked"
        itemCount={3}
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
      />,
    );

    expect(screen.getByText("ストック")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作品を検索してストックに追加" })).toHaveTextContent(
      "作品を検索",
    );
  });

  test("mobile では短いボタン文言を使い、押下で handler を呼ぶ", async () => {
    const user = userEvent.setup();
    const onOpenAddModal = vi.fn();

    render(
      <KanbanColumnHeader
        boardMode="video"
        status="stacked"
        itemCount={1}
        isMobileLayout={true}
        onOpenAddModal={onOpenAddModal}
      />,
    );

    await user.click(screen.getByRole("button", { name: "作品を検索してストックに追加" }));

    expect(screen.getByRole("button", { name: "作品を検索してストックに追加" })).toHaveTextContent(
      "検索",
    );
    expect(onOpenAddModal).toHaveBeenCalledTimes(1);
  });

  test("stacked 以外では追加ボタンを表示しない", () => {
    render(
      <KanbanColumnHeader
        boardMode="video"
        status="watching"
        itemCount={2}
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
      />,
    );

    expect(screen.getByText("視聴中")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "作品を検索してストックに追加" }),
    ).not.toBeInTheDocument();
  });
});
