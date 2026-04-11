import { renderHook, act } from "@testing-library/react";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { useBacklogDnd } from "./useBacklogDnd.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem } from "../types.ts";

const supabaseMocks = vi.hoisted(() => {
  const eq = vi.fn();
  const update = vi.fn(() => ({ eq }));
  return { eq, update };
});

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: {
    from: () => ({
      update: supabaseMocks.update,
    }),
  },
}));

setupTestLifecycle();

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "item-1",
    status: "stacked",
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: null,
    ...overrides,
  };
}

function makeRect(top = 100, height = 200): DOMRect {
  return {
    top,
    height,
    left: 0,
    right: 100,
    bottom: top + height,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createWatchingItems(): BacklogItem[] {
  return [
    createItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
    createItem({ id: "item-2", status: "watching", sort_order: 1000 }),
    createItem({ id: "item-3", status: "watching", sort_order: 2000 }),
  ];
}

function createMixedColumnItems(): BacklogItem[] {
  return [
    createItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
    createItem({ id: "item-2", status: "stacked", sort_order: 2000 }),
    createItem({ id: "item-3", status: "watching", sort_order: 1000 }),
  ];
}

const onAfterDrop = vi.fn().mockResolvedValue(undefined);
const feedback = {
  alert: vi.fn().mockResolvedValue(undefined),
  confirm: vi.fn().mockResolvedValue(true),
  toast: vi.fn().mockResolvedValue({ undone: false }),
};

function renderDnd(
  items: BacklogItem[],
  options?: {
    isMobileLayout?: boolean;
    onAfterDropOverride?: () => Promise<void>;
  },
) {
  return renderHook(() =>
    useBacklogDnd({
      items,
      isMobileLayout: options?.isMobileLayout ?? false,
      onAfterDrop: options?.onAfterDropOverride ?? onAfterDrop,
      feedback,
    }),
  );
}

function dragOver(
  result: ReturnType<typeof renderDnd>["result"],
  overId: string,
  clientY: number,
  activeId = "item-1",
) {
  act(() => {
    result.current.handleDragStart({ active: { id: activeId } } as DragStartEvent);
    result.current.handleDragOver({
      active: { id: activeId },
      over: { id: overId, rect: makeRect(100, 200) },
      activatorEvent: { clientY } as MouseEvent,
    } as unknown as DragOverEvent);
  });
}

function getOrderByStatus(
  result: ReturnType<typeof renderDnd>["result"],
  status: BacklogItem["status"],
) {
  return result.current.localItems.filter((i) => i.status === status).map((i) => i.id);
}

describe("useBacklogDnd", () => {
  const stackedItems = [
    createItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
    createItem({ id: "item-2", status: "stacked", sort_order: 2000 }),
  ];

  beforeEach(() => {
    supabaseMocks.eq.mockResolvedValue({ error: null });
    supabaseMocks.update.mockClear();
    onAfterDrop.mockClear();
    feedback.alert.mockClear();
  });

  test("handleDragStart で dragItemId がセットされる", () => {
    const { result } = renderDnd(stackedItems);

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
    });

    expect(result.current.dragItemId).toBe("item-1");
  });

  test("handleDragEnd で over が null なら supabase を呼ばない", async () => {
    const { result } = renderDnd(stackedItems);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "item-1" },
        over: null,
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    expect(supabaseMocks.update).not.toHaveBeenCalled();
    expect(onAfterDrop).not.toHaveBeenCalled();
    expect(result.current.dragItemId).toBeNull();
  });

  test("handleDragEnd 成功時に supabase を更新して onAfterDrop を呼び dragItemId をクリアする", async () => {
    const { result } = renderDnd(stackedItems);
    const rect = makeRect(100, 200);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "item-1" },
        over: { id: "item-2", rect },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    expect(supabaseMocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "stacked" }),
    );
    expect(onAfterDrop).toHaveBeenCalledTimes(1);
    expect(result.current.dragItemId).toBeNull();
  });

  test("handleDragEnd で supabase がエラーを返したら alert を出して onAfterDrop を呼ばない", async () => {
    supabaseMocks.eq.mockResolvedValueOnce({ error: { message: "DB エラー" } });
    const { result } = renderDnd(stackedItems);
    const rect = makeRect(100, 200);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "item-1" },
        over: { id: "item-2", rect },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    expect(feedback.alert).toHaveBeenCalledWith(expect.stringContaining("DB エラー"));
    expect(onAfterDrop).not.toHaveBeenCalled();
  });

  test("handleDragEnd 中はサーバー同期前でも localItems を維持してスナップバックしない", async () => {
    const deferred = createDeferred<{ error: null }>();
    supabaseMocks.eq.mockReturnValueOnce(deferred.promise);
    const { result, rerender } = renderHook(
      ({ items }) => useBacklogDnd({ items, isMobileLayout: false, onAfterDrop, feedback }),
      { initialProps: { items: stackedItems } },
    );

    dragOver(result, "item-2", 220);

    let dragEndPromise!: Promise<void>;
    act(() => {
      dragEndPromise = result.current.handleDragEnd({
        active: { id: "item-1" },
        over: { id: "item-2", rect: makeRect(100, 200) },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    rerender({ items: stackedItems });

    expect(result.current.dragItemId).toBeNull();
    expect(result.current.localItems.map((item) => item.id)).toEqual(["item-2", "item-1"]);

    deferred.resolve({ error: null });
    await act(async () => {
      await dragEndPromise;
    });
  });

  test("handleDragEnd 後に onAfterDrop が失敗しても次回同期をブロックし続けない", async () => {
    const failingOnAfterDrop = vi.fn().mockRejectedValue(new Error("reload failed"));
    const reorderedItems = [
      createItem({ id: "item-2", status: "stacked", sort_order: 1000 }),
      createItem({ id: "item-1", status: "stacked", sort_order: 2000 }),
    ];
    const { result, rerender } = renderHook(
      ({ items }) =>
        useBacklogDnd({
          items,
          isMobileLayout: false,
          onAfterDrop: failingOnAfterDrop,
          feedback,
        }),
      { initialProps: { items: stackedItems } },
    );

    dragOver(result, "item-2", 220);

    await expect(
      act(async () => {
        await result.current.handleDragEnd({
          active: { id: "item-1" },
          over: { id: "item-2", rect: makeRect(100, 200) },
          activatorEvent: null,
        } as unknown as DragEndEvent);
      }),
    ).rejects.toThrow("reload failed");

    rerender({ items: reorderedItems });

    expect(result.current.localItems).toEqual(reorderedItems);
  });

  test("handleDragOver で同列内の並び替えで localItems が更新される", async () => {
    const { result } = renderDnd(stackedItems);
    dragOver(result, "item-2", 220);
    expect(getOrderByStatus(result, "stacked")).toEqual(["item-2", "item-1"]);
  });

  test("handleDragOver で列またぎ時は pointer が over の上半分なら手前に挿入する", () => {
    const { result } = renderDnd(createWatchingItems());
    dragOver(result, "item-3", 120);
    expect(getOrderByStatus(result, "watching")).toEqual(["item-2", "item-1", "item-3"]);
  });

  test("handleDragOver で列またぎ時は pointer が over の下半分なら後ろに挿入する", () => {
    const { result } = renderDnd(createWatchingItems());
    dragOver(result, "item-2", 260);
    expect(getOrderByStatus(result, "watching")).toEqual(["item-2", "item-1", "item-3"]);
  });

  test("連続した handleDragOver でも updater の状態から列判定して status を取りこぼさない", () => {
    const { result } = renderDnd(createMixedColumnItems());

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
      result.current.handleDragOver({
        active: { id: "item-1" },
        over: { id: "item-3", rect: makeRect(100, 200) },
        activatorEvent: { clientY: 120 } as MouseEvent,
      } as unknown as DragOverEvent);
      result.current.handleDragOver({
        active: { id: "item-1" },
        over: { id: "item-2", rect: makeRect(100, 200) },
        activatorEvent: { clientY: 120 } as MouseEvent,
      } as unknown as DragOverEvent);
    });

    expect(getOrderByStatus(result, "stacked")).toEqual(["item-1", "item-2"]);
    expect(result.current.localItems.find((item) => item.id === "item-1")?.status).toBe("stacked");
  });

  test("handleDragOver で非空列の背景に落としたら列末尾に移動する", () => {
    const { result } = renderDnd(createWatchingItems());
    dragOver(result, "column:watching", 260);
    expect(getOrderByStatus(result, "watching")).toEqual(["item-2", "item-3", "item-1"]);
  });

  test("handleDragEnd で非空列の背景ドロップは列末尾の sort_order を保存する", async () => {
    const { result } = renderDnd(createWatchingItems());
    dragOver(result, "column:watching", 260);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "item-1" },
        over: { id: "column:watching", rect: makeRect(100, 200) },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    expect(supabaseMocks.update).toHaveBeenCalledWith({
      status: "watching",
      sort_order: 3000,
    });
  });

  test("モバイルレイアウトでは handleDragOver が列間移動をブロックする", () => {
    const { result } = renderDnd(
      [
        createItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
        createItem({ id: "item-2", status: "watching", sort_order: 1000 }),
      ],
      { isMobileLayout: true },
    );
    dragOver(result, "item-2", 220);

    // モバイルでは列またぎをブロックするので localItems は変わらない
    const item1 = result.current.localItems.find((i) => i.id === "item-1");
    expect(item1?.status).toBe("stacked");
  });

  test("handleDragCancel で localItems がサーバー状態に戻る", () => {
    const { result } = renderDnd(stackedItems);
    dragOver(result, "item-2", 220);

    act(() => {
      result.current.handleDragCancel();
    });

    expect(result.current.dragItemId).toBeNull();
    expect(result.current.localItems).toEqual(stackedItems);
  });
});
