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
  const { handleDeleteItem, handleAddTmdbWorksToStacked } = useBacklogActions({
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
  }, 15_000);

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

  test("複数追加で一部失敗したら成功分は反映しつつ失敗作品を通知する", async () => {
    const feedback = createToastFeedback();
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
        { display_title: null, primary_platform: null, note: null },
      ),
    );
    expect(loadItems).toHaveBeenCalled();
    expect(onWorksAdded).toHaveBeenCalled();
    expect(feedback.alert).toHaveBeenCalledWith("一部の作品を追加できませんでした: 作品2");
  });

  test("複数追加がすべて失敗したら詳細を通知して追加処理を中断する", async () => {
    const feedback = createToastFeedback();
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
    const feedback = createToastFeedback();
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
