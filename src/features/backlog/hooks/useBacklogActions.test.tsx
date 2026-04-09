import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem } from "../types.ts";
import { useBacklogActions } from "./useBacklogActions.ts";

const supabaseMocks = vi.hoisted(() => {
  const deleteEq = vi.fn();
  const deleteMock = vi.fn(() => ({ eq: deleteEq }));
  const updateEq = vi.fn();
  const updateMock = vi.fn(() => ({ eq: updateEq }));

  return {
    deleteEq,
    deleteMock,
    updateEq,
    updateMock,
  };
});

const repositoryMocks = vi.hoisted(() => {
  return {
    upsertTmdbWork: vi.fn(),
    upsertBacklogItemsToStatus: vi.fn(),
  };
});

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: {
    from: () => ({
      delete: supabaseMocks.deleteMock,
      update: supabaseMocks.updateMock,
    }),
  },
}));

vi.mock("../work-repository.ts", () => ({
  upsertTmdbWork: repositoryMocks.upsertTmdbWork,
}));

vi.mock("../backlog-repository.ts", () => ({
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
      rotten_tomatoes_score: null,
      imdb_rating: null,
      imdb_votes: null,
      metacritic_score: null,
    },
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
  };
}) {
  const { handleDeleteItem, handleAddTmdbWorksToStacked } = useBacklogActions({
    items,
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
    supabaseMocks.deleteEq.mockResolvedValue({ error: null });
    supabaseMocks.deleteMock.mockClear();
    supabaseMocks.updateEq.mockResolvedValue({ error: null });
    supabaseMocks.updateMock.mockClear();
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
    };
    const loadItems = vi.fn().mockResolvedValue(undefined);
    const onItemDeleted = vi.fn();
    supabaseMocks.deleteEq.mockResolvedValueOnce({
      error: { message: "row not found" },
    });

    const user = userEvent.setup();

    render(<HookHarness feedback={feedback} loadItems={loadItems} onItemDeleted={onItemDeleted} />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(feedback.alert).toHaveBeenCalledWith("削除に失敗しました: row not found"),
    );
    expect(onItemDeleted).not.toHaveBeenCalled();
    expect(loadItems).not.toHaveBeenCalled();
  });

  test("複数追加で一部失敗したら成功分は反映しつつ失敗作品を通知する", async () => {
    const feedback = {
      alert: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
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
        { primaryPlatform: null, note: null },
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
