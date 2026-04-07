import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem } from "../types.ts";
import { useBacklogActions } from "./useBacklogActions.ts";

const supabaseMocks = vi.hoisted(() => {
  const deleteEq = vi.fn();
  const deleteMock = vi.fn(() => ({ eq: deleteEq }));

  return {
    deleteEq,
    deleteMock,
  };
});

vi.mock("../../../lib/supabase.ts", () => ({
  supabase: {
    from: () => ({
      delete: supabaseMocks.deleteMock,
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

function HookHarness({
  items = [createItem()],
  loadItems = vi.fn().mockResolvedValue(undefined),
  onItemDeleted = vi.fn(),
  onWorksAdded = vi.fn(),
  feedback = {
    alert: vi.fn().mockResolvedValue(undefined),
    confirm: vi.fn().mockResolvedValue(true),
  },
}: {
  items?: BacklogItem[];
  loadItems?: () => Promise<void>;
  onItemDeleted?: (itemId: string) => void;
  onWorksAdded?: () => void;
  feedback?: {
    alert: (message: string) => void | Promise<void>;
    confirm: (message: string) => boolean | Promise<boolean>;
  };
}) {
  const { handleDeleteItem } = useBacklogActions({
    items,
    session: { user: { id: "user-1" } } as Session,
    loadItems,
    onItemDeleted,
    onWorksAdded,
    feedback,
  });

  return (
    <button type="button" onClick={() => void handleDeleteItem("item-1")}>
      削除
    </button>
  );
}

describe("useBacklogActions", () => {
  beforeEach(() => {
    supabaseMocks.deleteEq.mockResolvedValue({ error: null });
    supabaseMocks.deleteMock.mockClear();
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
});
