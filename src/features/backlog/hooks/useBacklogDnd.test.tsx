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

vi.mock("@dnd-kit/sortable", () => ({
  arrayMove: <T,>(arr: T[], from: number, to: number): T[] => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
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

describe("useBacklogDnd", () => {
  const onAfterDrop = vi.fn().mockResolvedValue(undefined);
  const feedback = {
    alert: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue(true),
  };

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
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
    });

    expect(result.current.dragItemId).toBe("item-1");
  });

  test("handleDragEnd で over が null なら supabase を呼ばない", async () => {
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );

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
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );
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
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );
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
      ({ items }) =>
        useBacklogDnd({
          items,
          isMobileLayout: false,
          onAfterDrop,
          feedback,
        }),
      { initialProps: { items: stackedItems } },
    );

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
      result.current.handleDragOver({
        active: { id: "item-1" },
        over: { id: "item-2" },
      } as unknown as DragOverEvent);
    });

    act(() => {
      void result.current.handleDragEnd({
        active: { id: "item-1" },
        over: { id: "item-2", rect: makeRect(100, 200) },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    rerender({ items: stackedItems });

    expect(result.current.dragItemId).toBeNull();
    expect(result.current.localItems.map((item) => item.id)).toEqual(["item-2", "item-1"]);

    deferred.resolve({ error: null });
    await act(async () => {});
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

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
      result.current.handleDragOver({
        active: { id: "item-1" },
        over: { id: "item-2" },
      } as unknown as DragOverEvent);
    });

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
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
    });

    act(() => {
      result.current.handleDragOver({
        active: { id: "item-1" },
        over: { id: "item-2" },
      } as unknown as DragOverEvent);
    });

    const stackedOrder = result.current.localItems
      .filter((i) => i.status === "stacked")
      .map((i) => i.id);
    expect(stackedOrder).toEqual(["item-2", "item-1"]);
  });

  test("モバイルレイアウトでは handleDragOver が列間移動をブロックする", () => {
    const crossColumnItems = [
      createItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
      createItem({ id: "item-2", status: "watching", sort_order: 1000 }),
    ];
    const { result } = renderHook(() =>
      useBacklogDnd({ items: crossColumnItems, isMobileLayout: true, onAfterDrop, feedback }),
    );

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
    });

    act(() => {
      result.current.handleDragOver({
        active: { id: "item-1" },
        over: { id: "item-2" },
      } as unknown as DragOverEvent);
    });

    // モバイルでは列またぎをブロックするので localItems は変わらない
    const item1 = result.current.localItems.find((i) => i.id === "item-1");
    expect(item1?.status).toBe("stacked");
  });

  test("handleDragCancel で localItems がサーバー状態に戻る", () => {
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );

    act(() => {
      result.current.handleDragStart({ active: { id: "item-1" } } as DragStartEvent);
      result.current.handleDragOver({
        active: { id: "item-1" },
        over: { id: "item-2" },
      } as unknown as DragOverEvent);
    });

    act(() => {
      result.current.handleDragCancel();
    });

    expect(result.current.dragItemId).toBeNull();
    expect(result.current.localItems).toEqual(stackedItems);
  });
});
