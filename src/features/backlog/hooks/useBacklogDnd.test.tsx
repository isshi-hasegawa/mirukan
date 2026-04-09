import { renderHook, act } from "@testing-library/react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
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

  test("非空列の column エリアへのドロップは supabase を呼ばない", async () => {
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );
    const rect = makeRect(100, 200);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "item-1" },
        over: { id: "column:stacked", rect },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    expect(supabaseMocks.update).not.toHaveBeenCalled();
    expect(onAfterDrop).not.toHaveBeenCalled();
  });

  test("top-slot へのドロップは先頭アイテムの前に挿入する", async () => {
    const { result } = renderHook(() =>
      useBacklogDnd({ items: stackedItems, isMobileLayout: false, onAfterDrop, feedback }),
    );
    const rect = makeRect(100, 8);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "item-2" },
        over: { id: "top-slot:stacked", rect },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    expect(supabaseMocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "stacked" }),
    );
    expect(onAfterDrop).toHaveBeenCalledTimes(1);
  });

  test("モバイルレイアウトでは列間ドラッグをブロックする", async () => {
    const crossColumnItems = [
      createItem({ id: "item-1", status: "stacked", sort_order: 1000 }),
      createItem({ id: "item-2", status: "watching", sort_order: 1000 }),
    ];
    const { result } = renderHook(() =>
      useBacklogDnd({ items: crossColumnItems, isMobileLayout: true, onAfterDrop, feedback }),
    );
    const rect = makeRect(100, 200);

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: "item-1" },
        over: { id: "item-2", rect },
        activatorEvent: null,
      } as unknown as DragEndEvent);
    });

    expect(supabaseMocks.update).not.toHaveBeenCalled();
    expect(onAfterDrop).not.toHaveBeenCalled();
  });
});
