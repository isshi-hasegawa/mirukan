import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { KanbanBoard } from "./KanbanBoard.tsx";

vi.mock("./KanbanColumn.tsx", () => ({
  KanbanColumn: ({
    status,
    items,
    extra,
  }: {
    status: BacklogStatus;
    items: BacklogItem[];
    extra?: React.ReactNode;
  }) => (
    <div>
      {extra}
      <div>
        {status}:{items.map((item) => item.id).join(",")}
      </div>
    </div>
  ),
}));

setupTestLifecycle();

function createItem(
  id: string,
  status: BacklogStatus,
  title: string,
  overrides: Partial<BacklogItem> = {},
): BacklogItem {
  return {
    id,
    status,
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: {
      id: `work-${id}`,
      title,
      work_type: "movie",
      source_type: "tmdb",
      tmdb_id: Number(id.replace(/\D/g, "")) || 1,
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

function renderKanbanBoard(overrides: Partial<React.ComponentProps<typeof KanbanBoard>> = {}) {
  return render(
    <KanbanBoard
      items={[
        createItem("item-1", "stacked", "作品1"),
        createItem("item-2", "watching", "作品2"),
      ]}
      dropIndicator={null}
      isMobileLayout={false}
      isMobileDragging={false}
      selectedTabStatus="stacked"
      onTabChange={vi.fn()}
      onOpenAddModal={vi.fn()}
      onOpenDetail={vi.fn()}
      onDeleteItem={vi.fn()}
      onMarkAsWatched={vi.fn()}
      columnRef={vi.fn()}
      {...overrides}
    />,
  );
}

describe("KanbanBoard", () => {
  test("desktop では全列を表示する", () => {
    renderKanbanBoard();

    expect(screen.getByText("stacked:item-1")).toBeInTheDocument();
    expect(screen.getByText("watching:item-2")).toBeInTheDocument();
    expect(screen.getByText("want_to_watch:")).toBeInTheDocument();
  });

  test("mobile では選択中の列だけを表示し、タブ押下で切り替える", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    renderKanbanBoard({
      isMobileLayout: true,
      selectedTabStatus: "stacked",
      onTabChange,
    });

    expect(screen.getByText("stacked:item-1")).toBeInTheDocument();
    expect(screen.queryByText("watching:item-2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "視聴中" }));

    expect(onTabChange).toHaveBeenCalledWith("watching");
  });

  test("mobile で左スワイプすると次のタブへ切り替える", () => {
    const onTabChange = vi.fn();
    renderKanbanBoard({
      isMobileLayout: true,
      selectedTabStatus: "stacked",
      onTabChange,
    });

    const content = document.querySelector(".board-tab-content");
    if (!content) throw new Error("tab content not found");

    fireEvent.touchStart(content, {
      touches: [{ clientX: 120, clientY: 20 }],
    });
    fireEvent.touchEnd(content, {
      changedTouches: [{ clientX: 20, clientY: 24 }],
    });

    expect(onTabChange).toHaveBeenCalledWith("want_to_watch");
  });
});
