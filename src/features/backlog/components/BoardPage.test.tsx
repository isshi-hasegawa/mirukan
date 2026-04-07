import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { BoardPage } from "./BoardPage.tsx";

const hookMocks = vi.hoisted(() => ({
  windowWidth: 1280,
  items: [] as BacklogItem[],
  isLoading: false,
  error: null as string | null,
  loadItems: vi.fn().mockResolvedValue(undefined),
  setItems: vi.fn(),
  onItemDeleted: null as ((itemId: string) => void) | null,
  onWorksAdded: null as (() => void) | null,
  handleDeleteItem: vi.fn(async (itemId: string) => {
    hookMocks.onItemDeleted?.(itemId);
  }),
  handleMarkAsWatched: vi.fn(),
  signOut: vi.fn().mockResolvedValue({ error: null }),
}));

setupTestLifecycle();

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: {
    auth: {
      signOut: hookMocks.signOut,
    },
  },
}));

vi.mock("../hooks/useWindowSize.ts", () => ({
  useWindowSize: () => hookMocks.windowWidth,
}));

vi.mock("../hooks/useBacklogItems.ts", () => ({
  useBacklogItems: () => ({
    items: hookMocks.items,
    setItems: hookMocks.setItems,
    isLoading: hookMocks.isLoading,
    error: hookMocks.error,
    loadItems: hookMocks.loadItems,
  }),
}));

vi.mock("../hooks/useBacklogDnd.ts", () => ({
  useBacklogDnd: () => ({
    dragItemId: null,
    dropIndicator: null,
    sensors: [],
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
  }),
}));

vi.mock("../hooks/useBacklogActions.ts", () => ({
  useBacklogActions: ({
    onItemDeleted,
    onWorksAdded,
  }: {
    onItemDeleted: (itemId: string) => void;
    onWorksAdded: () => void;
  }) => {
    hookMocks.onItemDeleted = onItemDeleted;
    hookMocks.onWorksAdded = onWorksAdded;

    return {
      handleDeleteItem: hookMocks.handleDeleteItem,
      handleMarkAsWatched: hookMocks.handleMarkAsWatched,
    };
  },
}));

vi.mock("./Header.tsx", () => ({
  Header: () => <div>header</div>,
}));

vi.mock("./KanbanBoard.tsx", () => ({
  KanbanBoard: ({
    selectedTabStatus,
    onTabChange,
    onOpenAddModal,
    onOpenDetail,
    onDeleteItem,
    columnRef,
  }: {
    selectedTabStatus: BacklogStatus;
    onTabChange: (status: BacklogStatus) => void;
    onOpenAddModal: () => void;
    onOpenDetail: (itemId: string) => void;
    onDeleteItem: (itemId: string) => void;
    columnRef: (status: BacklogStatus, el: HTMLElement | null) => void;
  }) => (
    <div>
      <p>selected-tab:{selectedTabStatus}</p>
      <div ref={(el) => columnRef("stacked", el)}>stacked-column-anchor</div>
      <button type="button" onClick={() => onTabChange("watching")}>
        watching に切り替え
      </button>
      <button type="button" onClick={onOpenAddModal}>
        追加モーダルを開く
      </button>
      <button type="button" onClick={() => onOpenDetail("item-1")}>
        詳細を開く
      </button>
      <button type="button" onClick={() => onDeleteItem("item-1")}>
        item-1 を削除
      </button>
    </div>
  ),
}));

vi.mock("./AddModal.tsx", () => ({
  AddModal: ({ onAdded, onClose }: { onAdded: () => Promise<void>; onClose: () => void }) => (
    <div>
      <p>add-modal</p>
      <button type="button" onClick={() => void onAdded()}>
        追加完了
      </button>
      <button type="button" onClick={onClose}>
        追加モーダルを閉じる
      </button>
    </div>
  ),
}));

vi.mock("./DetailModal.tsx", () => ({
  DetailModal: ({ item }: { item: BacklogItem | null }) => (
    <div>detail-modal:{item?.id ?? "missing"}</div>
  ),
}));

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

function renderBoardPage() {
  return render(
    <BoardPage session={{ user: { id: "user-1", email: "test@example.com" } } as never} />,
  );
}

describe("BoardPage", () => {
  beforeEach(() => {
    hookMocks.windowWidth = 1280;
    hookMocks.items = [createItem()];
    hookMocks.isLoading = false;
    hookMocks.error = null;
    hookMocks.loadItems.mockResolvedValue(undefined);
    hookMocks.setItems.mockReset();
    hookMocks.handleDeleteItem.mockClear();
    hookMocks.handleMarkAsWatched.mockClear();
    hookMocks.signOut.mockClear();
    hookMocks.onItemDeleted = null;
    hookMocks.onWorksAdded = null;
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("初回ロード中は loading 表示を出さない", () => {
    hookMocks.isLoading = true;

    const { container } = renderBoardPage();

    expect(container).toBeEmptyDOMElement();
  });

  test("取得エラー時はエラーメッセージを表示する", () => {
    hookMocks.error = "network failed";

    renderBoardPage();

    expect(screen.getByText("backlog の取得でつまずいています。")).toBeInTheDocument();
    expect(screen.getByText("network failed")).toBeInTheDocument();
  });

  test("モバイル時は追加完了後に stacked タブへ戻る", async () => {
    hookMocks.windowWidth = 390;
    const user = userEvent.setup();

    renderBoardPage();

    expect(screen.getByText("selected-tab:stacked")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "watching に切り替え" }));
    expect(screen.getByText("selected-tab:watching")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "追加モーダルを開く" }));
    await user.click(screen.getByRole("button", { name: "追加完了" }));
    await waitFor(() => expect(screen.getByText("selected-tab:stacked")).toBeInTheDocument());
  });

  test("desktop 時は追加完了後に stacked 列へ scroll する", async () => {
    const user = userEvent.setup();
    const scrollIntoViewSpy = vi.spyOn(Element.prototype, "scrollIntoView");

    renderBoardPage();

    await user.click(screen.getByRole("button", { name: "追加モーダルを開く" }));
    await user.click(screen.getByRole("button", { name: "追加完了" }));

    await waitFor(() =>
      expect(scrollIntoViewSpy).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      }),
    );
  });

  test("詳細モーダルを開いている item が削除されたらモーダルを閉じる", async () => {
    const user = userEvent.setup();

    renderBoardPage();

    await user.click(screen.getByRole("button", { name: "詳細を開く" }));
    expect(screen.getByText("detail-modal:item-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "item-1 を削除" }));

    await waitFor(() => expect(screen.queryByText("detail-modal:item-1")).not.toBeInTheDocument());
  });
});
