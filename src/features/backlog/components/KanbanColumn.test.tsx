import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";

const dndState = vi.hoisted(() => ({
  isOver: false,
}));

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: dndState.isOver,
  }),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
}));

vi.mock("./BacklogCard.tsx", () => ({
  BacklogCard: ({
    item,
    showModeBadge,
    onOpenDetail,
  }: {
    item: BacklogItem;
    showModeBadge: boolean;
    onOpenDetail: () => void;
  }) => (
    <button
      type="button"
      data-testid={`card-${item.id}`}
      data-show-mode-badge={String(showModeBadge)}
      onClick={onOpenDetail}
    >
      {item.works?.title}
    </button>
  ),
}));

setupTestLifecycle();

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "item-1",
    status: "stacked",
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: createWorkSummary({ title: "作品1" }),
    ...overrides,
  };
}

describe("KanbanColumn", () => {
  beforeEach(() => {
    dndState.isOver = false;
  });

  test("ストック列では絞り込みカードを表示する", () => {
    render(
      <KanbanColumn
        status="stacked"
        items={[createItem()]}
        activeViewingMode="thoughtful"
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
        onViewingModeToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole("group", { name: "おすすめの絞り込み" })).toBeInTheDocument();
    expect(screen.getByTestId("card-item-1")).toHaveAttribute("data-show-mode-badge", "true");
  });

  test("ストック列以外では絞り込みカードを表示しない", () => {
    render(
      <KanbanColumn
        status="watching"
        items={[createItem({ status: "watching" })]}
        activeViewingMode={null}
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
      />,
    );

    expect(screen.queryByRole("group", { name: "おすすめの絞り込み" })).not.toBeInTheDocument();
  });

  test("件数表示を header に出す", () => {
    render(
      <KanbanColumn
        status="watching"
        items={[
          createItem({ status: "watching" }),
          createItem({ id: "item-2", status: "watching" }),
        ]}
        activeViewingMode={null}
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("空の列にドラッグオーバーすると dropzone の強調と空状態メッセージを出す", () => {
    dndState.isOver = true;

    render(
      <KanbanColumn
        status="want_to_watch"
        items={[]}
        activeViewingMode={null}
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
      />,
    );

    const dropzone = document.querySelector('[data-dropzone-status="want_to_watch"]');
    expect(dropzone).toHaveStyle({
      minHeight: "120px",
      outline: "2px dashed rgba(191, 90, 54, 0.45)",
    });
  });

  test("視聴済みが 20 件を超えると過去分を折りたたみ、展開で表示する", async () => {
    const user = userEvent.setup();
    const watchedItems = Array.from({ length: 21 }, (_, index) =>
      createItem({
        id: `item-${index + 1}`,
        status: "watched",
        works: createWorkSummary({ title: `作品${index + 1}` }),
      }),
    );

    render(
      <KanbanColumn
        status="watched"
        items={watchedItems}
        activeViewingMode={null}
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
      />,
    );

    expect(screen.getByText("作品20")).toBeInTheDocument();
    expect(screen.queryByText("作品21")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "過去の視聴済み（1件）" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "過去の視聴済み（1件）" }));

    expect(screen.getByText("作品21")).toBeInTheDocument();
    expect(screen.getByTestId("card-item-21")).toHaveAttribute("data-show-mode-badge", "false");
  });

  test("カード押下で詳細を開く", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();

    render(
      <KanbanColumn
        status="watched"
        items={[
          createItem({ id: "item-1", status: "watched" }),
          createItem({
            id: "item-2",
            status: "watched",
            works: createWorkSummary({ title: "作品2" }),
          }),
        ]}
        activeViewingMode={null}
        isMobileLayout={false}
        onOpenAddModal={vi.fn()}
        onOpenDetail={onOpenDetail}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("card-item-1"));

    expect(onOpenDetail).toHaveBeenCalledWith("item-1");
  });
});
