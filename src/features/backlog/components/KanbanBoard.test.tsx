import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem, BacklogStatus, WorkSummary } from "../types.ts";
import type { ViewingMode } from "../types.ts";
import { KanbanBoard } from "./KanbanBoard.tsx";

vi.mock("./KanbanColumn.tsx", () => ({
  KanbanColumn: ({
    status,
    items,
    extra,
    activeViewingMode,
    onViewingModeToggle,
  }: {
    status: BacklogStatus;
    items: BacklogItem[];
    extra?: React.ReactNode;
    activeViewingMode?: ViewingMode | null;
    onViewingModeToggle?: (mode: ViewingMode) => void;
  }) => (
    <div>
      {extra}
      {status === "stacked" && onViewingModeToggle ? (
        <div>
          <button
            type="button"
            aria-pressed={activeViewingMode === "focus"}
            onClick={() => onViewingModeToggle("focus")}
          >
            ガッツリ
          </button>
          <button
            type="button"
            aria-pressed={activeViewingMode === "quick"}
            onClick={() => onViewingModeToggle("quick")}
          >
            サクッと
          </button>
        </div>
      ) : null}
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
      rotten_tomatoes_score: null,
      imdb_rating: null,
      imdb_votes: null,
      metacritic_score: null,
    },
    ...overrides,
  };
}

function createWorkSummary(id: string, title: string, runtimeMinutes: number): WorkSummary {
  return {
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
    runtime_minutes: runtimeMinutes,
    typical_episode_runtime_minutes: null,
    duration_bucket: null,
    genres: [],
    season_count: null,
    season_number: null,
    focus_required_score: null,
    background_fit_score: null,
    completion_load_score: null,
    rotten_tomatoes_score: null,
    imdb_rating: null,
    imdb_votes: null,
    metacritic_score: null,
  };
}

function renderKanbanBoard(
  overrides: Partial<React.ComponentProps<typeof KanbanBoard>> = {},
  options?: { searchParams?: string; onUrlUpdate?: OnUrlUpdateFunction },
) {
  return render(
    <KanbanBoard
      items={[createItem("item-1", "stacked", "作品1"), createItem("item-2", "watching", "作品2")]}
      isDragging={false}
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
    {
      wrapper: withNuqsTestingAdapter({
        searchParams: options?.searchParams,
        onUrlUpdate: options?.onUrlUpdate,
      }),
    },
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

  test("URL の view クエリから絞り込み状態を復元する", () => {
    renderKanbanBoard({}, { searchParams: "?view=quick" });

    expect(screen.getByRole("button", { name: /サクッと/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("絞り込み切り替えで view クエリを更新する", async () => {
    const user = userEvent.setup();
    const onUrlUpdate = vi.fn();
    renderKanbanBoard({}, { onUrlUpdate });

    await user.click(screen.getByRole("button", { name: /ガッツリ/ }));
    await user.click(screen.getByRole("button", { name: /ガッツリ/ }));

    expect(onUrlUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        queryString: "?view=focus",
      }),
    );
    expect(onUrlUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        queryString: "",
      }),
    );
  });

  test("view 絞り込み中にドラッグ開始しても stacked 列の表示順を維持する", () => {
    const items = [
      createItem("item-1", "stacked", "長編", {
        works: createWorkSummary("item-1", "長編", 120),
      }),
      createItem("item-2", "stacked", "短編", {
        works: createWorkSummary("item-2", "短編", 20),
      }),
    ];

    const { rerender } = renderKanbanBoard(
      {
        items,
      },
      { searchParams: "?view=quick" },
    );

    expect(screen.getByText("stacked:item-2,item-1")).toBeInTheDocument();

    rerender(
      <KanbanBoard
        items={items}
        isDragging
        isMobileLayout={false}
        isMobileDragging={false}
        selectedTabStatus="stacked"
        onTabChange={vi.fn()}
        onOpenAddModal={vi.fn()}
        onOpenDetail={vi.fn()}
        onDeleteItem={vi.fn()}
        onMarkAsWatched={vi.fn()}
        columnRef={vi.fn()}
      />,
    );

    expect(screen.getByText("stacked:item-2,item-1")).toBeInTheDocument();
  });
});
