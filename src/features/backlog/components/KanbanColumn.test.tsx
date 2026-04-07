import { render, screen } from "@testing-library/react";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem } from "../types.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";

vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
  }),
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
    works: {
      id: "work-1",
      title: "作品1",
      work_type: "movie",
      source_type: "tmdb",
      tmdb_id: 1,
      tmdb_media_type: "movie",
      original_title: null,
      overview: null,
      poster_path: null,
      release_date: null,
      runtime_minutes: null,
      typical_episode_runtime_minutes: null,
      duration_bucket: null,
      genres: [],
      season_count: null,
      season_number: null,
      focus_required_score: null,
      background_fit_score: null,
      completion_load_score: null,
    },
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
        dropIndicator={null}
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
        dropIndicator={null}
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
        dropIndicator={null}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
