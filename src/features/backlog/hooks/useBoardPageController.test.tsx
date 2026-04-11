import { renderHook, act } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createBacklogItem } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { useBoardPageController } from "./useBoardPageController.ts";

const hookMocks = vi.hoisted(() => ({
  windowWidth: 1280,
  items: [] as BacklogItem[],
  isLoading: false,
  error: null as string | null,
  loadItems: vi.fn().mockResolvedValue(undefined),
  detailModalOpenItemId: null as string | null,
}));

vi.mock("./useWindowSize.ts", () => ({
  useWindowSize: () => hookMocks.windowWidth,
}));

vi.mock("./useBacklogItems.ts", () => ({
  useBacklogItems: () => ({
    items: hookMocks.items,
    isLoading: hookMocks.isLoading,
    error: hookMocks.error,
    loadItems: hookMocks.loadItems,
  }),
}));

vi.mock("./useBacklogDnd.ts", () => ({
  useBacklogDnd: () => ({
    dragItemId: null,
    localItems: hookMocks.items,
    sensors: [],
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragCancel: vi.fn(),
    handleDragEnd: vi.fn(),
  }),
}));

vi.mock("./useBacklogActions.ts", () => ({
  useBacklogActions: () => ({
    handleDeleteItem: vi.fn(),
    handleMarkAsWatched: vi.fn(),
  }),
}));

vi.mock("./useBacklogFeedback.tsx", () => ({
  useBacklogFeedback: () => ({
    feedback: {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
    },
    feedbackUi: null,
  }),
}));

setupTestLifecycle();

const session = { user: { id: "user-1" } } as Session;

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return createBacklogItem({ works: null, ...overrides });
}

describe("useBoardPageController", () => {
  beforeEach(() => {
    hookMocks.windowWidth = 1280;
    hookMocks.items = [];
    hookMocks.isLoading = false;
    hookMocks.error = null;
    hookMocks.loadItems.mockClear();
  });

  test("windowWidth が 720 以下のとき isMobileLayout が true になる", () => {
    hookMocks.windowWidth = 720;

    const { result } = renderHook(() => useBoardPageController({ session }));

    expect(result.current.isMobileLayout).toBe(true);
  });

  test("windowWidth が 721 以上のとき isMobileLayout が false になる", () => {
    hookMocks.windowWidth = 721;

    const { result } = renderHook(() => useBoardPageController({ session }));

    expect(result.current.isMobileLayout).toBe(false);
  });

  test("detailModal.openItemId が null のとき detailModal.item は null になる", () => {
    hookMocks.items = [createItem({ id: "item-1" })];

    const { result } = renderHook(() => useBoardPageController({ session }));

    expect(result.current.detailModal.item).toBeNull();
  });

  test("board.onOpenDetail を呼ぶと detailModal.item が解決される", () => {
    const item = createItem({ id: "item-1" });
    hookMocks.items = [item];

    const { result } = renderHook(() => useBoardPageController({ session }));

    act(() => {
      result.current.board.onOpenDetail("item-1");
    });

    expect(result.current.detailModal.item).toEqual(item);
    expect(result.current.detailModal.isOpen).toBe(true);
  });

  test("board.onOpenDetail で存在しない ID を渡すと detailModal.item は null になる", () => {
    hookMocks.items = [createItem({ id: "item-1" })];

    const { result } = renderHook(() => useBoardPageController({ session }));

    act(() => {
      result.current.board.onOpenDetail("non-existent-id");
    });

    expect(result.current.detailModal.item).toBeNull();
    expect(result.current.detailModal.isOpen).toBe(true);
  });

  test("モバイル時は isMobileDragging が dragItemId の有無に依存する", () => {
    hookMocks.windowWidth = 390;

    const { result } = renderHook(() => useBoardPageController({ session }));

    // dragItemId は null なので isMobileDragging は false
    expect(result.current.board.isMobileDragging).toBe(false);
  });
});
