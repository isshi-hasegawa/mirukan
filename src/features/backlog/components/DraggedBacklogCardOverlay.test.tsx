import { render, screen } from "@testing-library/react";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { DraggedBacklogCardOverlay } from "./DraggedBacklogCardOverlay.tsx";

setupTestLifecycle();

function createItem(): BacklogItem {
  return {
    id: "item-1",
    status: "watching",
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: createWorkSummary({
      title: "ドラッグ中の作品",
      poster_path: "/poster.jpg",
    }),
  };
}

describe("DraggedBacklogCardOverlay", () => {
  test("item がないときは何も描画しない", () => {
    const { container } = render(<DraggedBacklogCardOverlay item={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  test("作品タイトルとポスターを描画する", () => {
    const { container } = render(<DraggedBacklogCardOverlay item={createItem()} />);

    expect(screen.getByText("ドラッグ中の作品")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://image.tmdb.org/t/p/w200/poster.jpg",
    );
  });
});
