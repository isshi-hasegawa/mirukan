import { render, screen } from "@testing-library/react";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
}));

vi.mock("./BacklogCard.tsx", () => ({
  BacklogCard: ({ item }: { item: BacklogItem }) => <div>{item.works?.title}</div>,
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
});
