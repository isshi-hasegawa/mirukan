import { useState } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { useBacklogActions } from "./useBacklogActions.ts";

const repositoryMocks = vi.hoisted(() => {
  return {
    deleteBacklogItem: vi.fn(),
    updateBacklogItem: vi.fn(),
    upsertBacklogItemsToStatus: vi.fn(),
    upsertTmdbWork: vi.fn(),
  };
});

vi.mock("../work-repository.ts", () => ({
  upsertTmdbWork: repositoryMocks.upsertTmdbWork,
}));

vi.mock("../backlog-repository.ts", () => ({
  deleteBacklogItem: repositoryMocks.deleteBacklogItem,
  updateBacklogItem: repositoryMocks.updateBacklogItem,
  upsertBacklogItemsToStatus: repositoryMocks.upsertBacklogItemsToStatus,
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

function createSearchResult(overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return {
    tmdbId: 1,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "作品1",
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: null,
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
    ...overrides,
  };
}

function HookHarness({
  items = [createItem()],
  loadItems = vi.fn().mockResolvedValue(undefined),
  onItemDeleted = vi.fn(),
  onWorksAdded = vi.fn(),
  results = [createSearchResult()],
  feedback = {
    alert: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue(true),
    toast: vi.fn(),
  },
}: {
  items?: BacklogItem[];
  loadItems?: () => Promise<void>;
  onItemDeleted?: (itemId: string) => void;
  onWorksAdded?: () => void;
  results?: TmdbSearchResult[];
  feedback?: {
    alert: (message: string) => void | Promise<void>;
    confirm: (message: string) => boolean | Promise<boolean>;
    toast: (options: {
      message: string;
      actionLabel?: string;
      durationMs?: number;
      onAction?: () => void | Promise<void>;
      onClose?: () => void | Promise<void>;
    }) => void | Promise<void>;
  };
}) {
  const [localItems, setLocalItems] = useState(items);
  const { handleDeleteItem, handleAddTmdbWorksToStacked } = useBacklogActions({
    items: localItems,
    session: { user: { id: "user-1" } } as Session,
    loadItems,
    setLocalItems,
    beginOptimisticUpdate: () => vi.fn(),
    onItemDeleted,
    onWorksAdded,
    feedback,
  });

  return (
    <>
      <p data-testid="local-items">{localItems.map((item) => item.id).join(",")}</p>
      <button type="button" onClick={() => void handleDeleteItem("item-1")}>
        削除
      </button>
      <button type="button" onClick={() => void handleAddTmdbWorksToStacked(results)}>
        追加
      </button>
    </>
  );
}

describe("useBacklogActions", () => {
  beforeEach(() => {
    repositoryMocks.deleteBacklogItem.mockResolvedValue({ error: null });
    repositoryMocks.updateBacklogItem.mockResolvedValue({ error: null });
    repositoryMocks.upsertTmdbWork.mockResolvedValue({ data: { id: "work-1" }, error: null });
    repositoryMocks.upsertBacklogItemsToStatus.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("delete 失敗時は alert を出して reload や state 更新をしない", async () => {
    const feedback = {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
      toast: vi.fn(async ({ onClose }) => {
        await onClose?.();
      }),
    };
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onItemDeleted = vi.fn();
    repositoryMocks.deleteBacklogItem.mockResolvedValueOnce({
      error: "row not found",
    });

    const user = userEvent.setup();

    render(<HookHarness feedback={feedback} loadItems={loadItems} onItemDeleted={onItemDeleted} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(feedback.alert).toHaveBeenCalledWith("削除に失敗しました: row not found"),
    );
    expect(onItemDeleted).toHaveBeenCalledWith("item-1");
    expect(screen.getByTestId("local-items")).toHaveTextContent("item-1");
    expect(loadItems).not.toHaveBeenCalled();
  });

  test("delete は toast を閉じるまで Supabase delete を遅延し、先に localItems から消す", async () => {
    let closeToast: (() => void | Promise<void>) | undefined;
    const feedback = {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
      toast: vi.fn(({ onClose }) => {
        closeToast = onClose;
      }),
    };
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onItemDeleted = vi.fn();
    const user = userEvent.setup();

    render(<HookHarness feedback={feedback} loadItems={loadItems} onItemDeleted={onItemDeleted} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(screen.getByTestId("local-items")).toHaveTextContent("");
    expect(repositoryMocks.deleteBacklogItem).not.toHaveBeenCalled();
    expect(onItemDeleted).toHaveBeenCalledWith("item-1");

    await closeToast?.();

    await waitFor(() => expect(repositoryMocks.deleteBacklogItem).toHaveBeenCalledWith("item-1"));
    expect(loadItems).toHaveBeenCalled();
  });

  test("delete の Undo で localItems を戻し、Supabase delete を呼ばない", async () => {
    let undoDelete: (() => void | Promise<void>) | undefined;
    const feedback = {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
      toast: vi.fn(({ onAction }) => {
        undoDelete = onAction;
      }),
    };
    const user = userEvent.setup();

    render(<HookHarness feedback={feedback} />);

    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByTestId("local-items")).toHaveTextContent("");

    await act(async () => {
      await undoDelete?.();
    });

    await waitFor(() => expect(screen.getByTestId("local-items")).toHaveTextContent("item-1"));
    expect(repositoryMocks.deleteBacklogItem).not.toHaveBeenCalled();
  });

  test("複数追加で一部失敗したら成功分は反映しつつ失敗作品を通知する", async () => {
    const feedback = {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
      toast: vi.fn(),
    };
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onWorksAdded = vi.fn();
    repositoryMocks.upsertTmdbWork
      .mockResolvedValueOnce({ data: { id: "work-1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "tmdb failed" } });

    const user = userEvent.setup();

    render(
      <HookHarness
        items={[]}
        results={[createSearchResult(), createSearchResult({ tmdbId: 2, title: "作品2" })]}
        feedback={feedback}
        loadItems={loadItems}
        onWorksAdded={onWorksAdded}
      />,
    );

    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() =>
      expect(repositoryMocks.upsertBacklogItemsToStatus).toHaveBeenCalledWith(
        "user-1",
        [],
        ["work-1"],
        "stacked",
        { primary_platform: null, note: null },
      ),
    );
    expect(loadItems).toHaveBeenCalled();
    expect(onWorksAdded).toHaveBeenCalled();
    expect(feedback.alert).toHaveBeenCalledWith("一部の作品を追加できませんでした: 作品2");
  });

  test("複数追加がすべて失敗したら詳細を通知して追加処理を中断する", async () => {
    const feedback = {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
      toast: vi.fn(),
    };
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onWorksAdded = vi.fn();
    repositoryMocks.upsertTmdbWork
      .mockResolvedValueOnce({ data: null, error: { message: "tmdb failed" } })
      .mockResolvedValueOnce({ data: null, error: { message: "tmdb failed" } });

    const user = userEvent.setup();

    render(
      <HookHarness
        results={[createSearchResult(), createSearchResult({ tmdbId: 2, title: "作品2" })]}
        feedback={feedback}
        loadItems={loadItems}
        onWorksAdded={onWorksAdded}
      />,
    );

    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() =>
      expect(feedback.alert).toHaveBeenCalledWith("作品の追加に失敗しました: 作品1、作品2"),
    );
    expect(repositoryMocks.upsertBacklogItemsToStatus).not.toHaveBeenCalled();
    expect(loadItems).not.toHaveBeenCalled();
    expect(onWorksAdded).not.toHaveBeenCalled();
  });

  test("確認ダイアログの件数は追加成功した作品数を使う", async () => {
    const feedback = {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
      toast: vi.fn(),
    };
    const user = userEvent.setup();
    repositoryMocks.upsertTmdbWork
      .mockResolvedValueOnce({ data: { id: "work-1" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "tmdb failed" } });

    render(
      <HookHarness
        items={[
          createItem({
            status: "watching",
          }),
        ]}
        results={[createSearchResult(), createSearchResult({ tmdbId: 2, title: "作品2" })]}
        feedback={feedback}
      />,
    );

    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => expect(feedback.confirm).toHaveBeenCalledTimes(1));
    expect(feedback.confirm).toHaveBeenCalledWith(expect.stringContaining("1件の作品"));
  });
});
