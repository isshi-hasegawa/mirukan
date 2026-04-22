import type React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

function createToastFeedback(undone = false) {
  return {
    alert: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue(true),
    toast: vi.fn().mockResolvedValue({ undone }),
  };
}

function HookHarness({
  items = [createItem()],
  localItems,
  setLocalItems = vi.fn(),
  setPendingDeleteIds = vi.fn(),
  loadItems = vi.fn().mockResolvedValue(undefined),
  onItemDeleted = vi.fn(),
  onWorksAdded = vi.fn(),
  results = [createSearchResult()],
  feedback = createToastFeedback(),
}: Readonly<{
  items?: BacklogItem[];
  localItems?: BacklogItem[];
  setLocalItems?: React.Dispatch<React.SetStateAction<BacklogItem[]>>;
  setPendingDeleteIds?: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
  loadItems?: () => Promise<void>;
  onItemDeleted?: (itemId: string) => void;
  onWorksAdded?: () => void;
  results?: TmdbSearchResult[];
  feedback?: ReturnType<typeof createToastFeedback>;
}>) {
  const { handleDeleteItem, handleMarkAsWatched, handleAddTmdbWorksToStacked } = useBacklogActions({
    items,
    localItems: localItems ?? items,
    setLocalItems,
    setPendingDeleteIds,
    session: { user: { id: "user-1" } } as Session,
    loadItems,
    onItemDeleted,
    onWorksAdded,
    feedback,
  });

  return (
    <>
      <button type="button" onClick={() => void handleDeleteItem("item-1")}>
        削除
      </button>
      <button type="button" onClick={() => void handleMarkAsWatched("item-1")}>
        視聴済みにする
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

  test("delete 成功時は楽観的除去後に toast を表示し、完了後に reload する", async () => {
    const feedback = createToastFeedback(false);
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onItemDeleted = vi.fn();
    const setLocalItems = vi.fn();

    const user = userEvent.setup();

    render(
      <HookHarness
        feedback={feedback}
        loadItems={loadItems}
        onItemDeleted={onItemDeleted}
        setLocalItems={setLocalItems}
      />,
    );

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(loadItems).toHaveBeenCalled());
    expect(setLocalItems).toHaveBeenCalled();
    expect(onItemDeleted).toHaveBeenCalledWith("item-1");
    expect(feedback.toast).toHaveBeenCalledWith("削除しました", {
      undoLabel: "元に戻す",
      timeoutMs: 5000,
    });
  });

  test("undo 時は setLocalItems で復元して削除 API を呼ばない", async () => {
    const feedback = createToastFeedback(true);
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const setLocalItems = vi.fn();

    const user = userEvent.setup();

    render(<HookHarness feedback={feedback} loadItems={loadItems} setLocalItems={setLocalItems} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(setLocalItems).toHaveBeenCalledTimes(2));
    expect(repositoryMocks.deleteBacklogItem).not.toHaveBeenCalled();
    expect(loadItems).not.toHaveBeenCalled();
  });

  test("undo 時の updater は pendingDeleteIds を外し、元の位置に復元する", async () => {
    const feedback = createToastFeedback(true);
    let pendingDeleteIds = new Set<string>();
    let localItems = [
      createItem(),
      createItem({ id: "item-2", works: createWorkSummary({ title: "作品2" }) }),
    ];
    const setPendingDeleteIds = vi.fn((updater: React.SetStateAction<ReadonlySet<string>>) => {
      pendingDeleteIds =
        typeof updater === "function"
          ? new Set(
              (updater as (prev: ReadonlySet<string>) => ReadonlySet<string>)(pendingDeleteIds),
            )
          : new Set(updater);
    });
    const setLocalItems = vi.fn((updater: React.SetStateAction<BacklogItem[]>) => {
      localItems = typeof updater === "function" ? updater(localItems) : updater;
    });

    const user = userEvent.setup();

    render(
      <HookHarness
        feedback={feedback}
        localItems={localItems}
        setLocalItems={setLocalItems}
        setPendingDeleteIds={setPendingDeleteIds}
      />,
    );

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(setLocalItems).toHaveBeenCalledTimes(2));
    expect(pendingDeleteIds.has("item-1")).toBe(false);
    expect(localItems.map((item) => item.id)).toEqual(["item-1", "item-2"]);
  });

  test("undo 復元時にすでに item があれば重複して挿入しない", async () => {
    const feedback = createToastFeedback(true);
    const item = createItem();
    let localItems = [item];
    let updateCount = 0;
    const setLocalItems = vi.fn((updater: React.SetStateAction<BacklogItem[]>) => {
      if (typeof updater !== "function") {
        localItems = updater;
        return;
      }

      updateCount += 1;
      if (updateCount === 1) {
        localItems = updater(localItems);
        return;
      }

      const nextItems = updater([item]);
      expect(nextItems).toEqual([item]);
      localItems = nextItems;
    });

    const user = userEvent.setup();

    render(
      <HookHarness feedback={feedback} localItems={localItems} setLocalItems={setLocalItems} />,
    );

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(setLocalItems).toHaveBeenCalledTimes(2));
    expect(localItems).toEqual([item]);
  });

  test("delete 失敗時は alert を出して reload する", async () => {
    const feedback = createToastFeedback(false);
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
    expect(loadItems).toHaveBeenCalled();
  });

  test("delete 完了後の updater は pendingDeleteIds から対象を外す", async () => {
    const feedback = createToastFeedback(false);
    let pendingDeleteIds = new Set<string>();
    const setPendingDeleteIds = vi.fn((updater: React.SetStateAction<ReadonlySet<string>>) => {
      pendingDeleteIds =
        typeof updater === "function"
          ? new Set(
              (updater as (prev: ReadonlySet<string>) => ReadonlySet<string>)(pendingDeleteIds),
            )
          : new Set(updater);
    });

    const user = userEvent.setup();

    render(<HookHarness feedback={feedback} setPendingDeleteIds={setPendingDeleteIds} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => expect(repositoryMocks.deleteBacklogItem).toHaveBeenCalledWith("item-1"));
    expect(pendingDeleteIds.has("item-1")).toBe(false);
  });

  test("localItems に対象がなければ delete を何もしない", async () => {
    const feedback = createToastFeedback(false);
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const setLocalItems = vi.fn();
    const setPendingDeleteIds = vi.fn();
    const onItemDeleted = vi.fn();
    const user = userEvent.setup();

    render(
      <HookHarness
        items={[createItem()]}
        localItems={[createItem({ id: "item-2" })]}
        feedback={feedback}
        loadItems={loadItems}
        setLocalItems={setLocalItems}
        setPendingDeleteIds={setPendingDeleteIds}
        onItemDeleted={onItemDeleted}
      />,
    );

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(feedback.toast).not.toHaveBeenCalled();
    expect(setLocalItems).not.toHaveBeenCalled();
    expect(setPendingDeleteIds).not.toHaveBeenCalled();
    expect(onItemDeleted).not.toHaveBeenCalled();
    expect(loadItems).not.toHaveBeenCalled();
  });

  test("mark as watched 成功時は watched の先頭 sort_order で更新して reload する", async () => {
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <HookHarness
        items={[
          createItem({ id: "item-1", status: "stacked", sort_order: 5000 }),
          createItem({ id: "item-2", status: "watched", sort_order: 3000 }),
          createItem({ id: "item-3", status: "watched", sort_order: 1000 }),
        ]}
        loadItems={loadItems}
      />,
    );

    await user.click(screen.getByRole("button", { name: "視聴済みにする" }));

    await waitFor(() =>
      expect(repositoryMocks.updateBacklogItem).toHaveBeenCalledWith("item-1", {
        status: "watched",
        sort_order: 0,
      }),
    );
    expect(loadItems).toHaveBeenCalled();
  });

  test("mark as watched 失敗時は alert を表示して reload しない", async () => {
    const feedback = createToastFeedback();
    const loadItems = vi.fn().mockResolvedValue(undefined);
    repositoryMocks.updateBacklogItem.mockResolvedValueOnce({
      error: "update failed",
    });

    const user = userEvent.setup();

    render(<HookHarness feedback={feedback} loadItems={loadItems} />);

    await user.click(screen.getByRole("button", { name: "視聴済みにする" }));

    await waitFor(() =>
      expect(feedback.alert).toHaveBeenCalledWith("変更に失敗しました: update failed"),
    );
    expect(loadItems).not.toHaveBeenCalled();
  });

  test("追加対象が空なら何もしない", async () => {
    const feedback = createToastFeedback();
    const user = userEvent.setup();

    render(<HookHarness results={[]} feedback={feedback} />);

    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(repositoryMocks.upsertTmdbWork).not.toHaveBeenCalled();
    expect(repositoryMocks.upsertBacklogItemsToStatus).not.toHaveBeenCalled();
    expect(feedback.alert).not.toHaveBeenCalled();
  });

  test("複数追加で一部失敗したら成功分は反映しつつ失敗作品を通知する", async () => {
    const feedback = createToastFeedback();
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onWorksAdded = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
        { display_title: null, primary_platform: null, note: null },
      ),
    );
    expect(loadItems).toHaveBeenCalled();
    expect(onWorksAdded).toHaveBeenCalled();
    expect(feedback.alert).toHaveBeenCalledWith("一部の作品を追加できませんでした: 作品2");
    consoleErrorSpy.mockRestore();
  });

  test("複数追加がすべて失敗したら詳細を通知して追加処理を中断する", async () => {
    const feedback = createToastFeedback();
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onWorksAdded = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    consoleErrorSpy.mockRestore();
  });

  test("確認ダイアログの件数は追加成功した作品数を使う", async () => {
    const feedback = createToastFeedback();
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
    consoleErrorSpy.mockRestore();
  });

  test("確認ダイアログでキャンセルしたら追加を中断する", async () => {
    const feedback = createToastFeedback();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    feedback.confirm.mockResolvedValue(false);
    const user = userEvent.setup();

    render(
      <HookHarness
        items={[
          createItem({
            id: "item-9",
            status: "watching",
            works: createWorkSummary({ id: "work-1", title: "作品1" }),
          }),
        ]}
        results={[createSearchResult()]}
        feedback={feedback}
      />,
    );

    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => expect(feedback.confirm).toHaveBeenCalledTimes(1));
    expect(repositoryMocks.upsertBacklogItemsToStatus).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test("選択作品がすでに stacked のみなら専用メッセージを表示する", async () => {
    const feedback = createToastFeedback();
    const user = userEvent.setup();

    render(
      <HookHarness
        items={[
          createItem({
            id: "item-9",
            status: "stacked",
            works: createWorkSummary({ id: "work-1", title: "作品1" }),
          }),
        ]}
        results={[createSearchResult()]}
        feedback={feedback}
      />,
    );

    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() =>
      expect(feedback.alert).toHaveBeenCalledWith("選択した作品はすでにストックにあります"),
    );
    expect(repositoryMocks.upsertBacklogItemsToStatus).not.toHaveBeenCalled();
  });

  test("追加自体は成功したが失敗作品がない場合は alert を出さない", async () => {
    const feedback = createToastFeedback();
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onWorksAdded = vi.fn();
    const user = userEvent.setup();

    render(
      <HookHarness
        items={[]}
        results={[createSearchResult()]}
        feedback={feedback}
        loadItems={loadItems}
        onWorksAdded={onWorksAdded}
      />,
    );

    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() => expect(repositoryMocks.upsertBacklogItemsToStatus).toHaveBeenCalled());
    expect(loadItems).toHaveBeenCalled();
    expect(onWorksAdded).toHaveBeenCalled();
    expect(feedback.alert).not.toHaveBeenCalled();
  });

  test("backlog item 追加に失敗したら alert を表示して reload しない", async () => {
    const feedback = createToastFeedback();
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onWorksAdded = vi.fn();
    repositoryMocks.upsertBacklogItemsToStatus.mockResolvedValueOnce({
      error: "insert failed",
    });

    const user = userEvent.setup();

    render(
      <HookHarness
        items={[]}
        results={[createSearchResult()]}
        feedback={feedback}
        loadItems={loadItems}
        onWorksAdded={onWorksAdded}
      />,
    );

    await user.click(screen.getByRole("button", { name: "追加" }));

    await waitFor(() =>
      expect(feedback.alert).toHaveBeenCalledWith("追加に失敗しました: insert failed"),
    );
    expect(loadItems).not.toHaveBeenCalled();
    expect(onWorksAdded).not.toHaveBeenCalled();
  });
});
