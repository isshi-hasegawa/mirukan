import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByRole("button", { name: /ガッツリ/ })).toHaveTextContent("ガッツリ集中して一本見たい");
    expect(screen.getByRole("button", { name: /じっくり/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /サクッと/ })).toHaveTextContent("サクッと短時間でテンポよく");
    expect(screen.getByRole("button", { name: /のんびり/ })).toHaveTextContent("のんびり流し見や作業のおともに");
  });

  test("モードカードを押すと toggle handler を呼ぶ", async () => {
    const user = userEvent.setup();
    const onViewingModeToggle = vi.fn();

    render(
      <KanbanColumn
        status="stacked"
        items={[createItem()]}
        activeViewingMode={null}
        isMobileLayout={true}
        dropIndicator={null}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
        onViewingModeToggle={onViewingModeToggle}
      />,
    );

    await user.click(screen.getByRole("button", { name: /サクッと/ }));

    expect(onViewingModeToggle).toHaveBeenCalledWith("quick");
  });
});
