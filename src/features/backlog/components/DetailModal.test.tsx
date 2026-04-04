import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createDetailModalState } from "../helpers.ts";
import type { BacklogItem, DetailModalState } from "../types.ts";
import { DetailModal } from "./DetailModal.tsx";

const dataMocks = vi.hoisted(() => ({
  updateBacklogItem: vi.fn(),
}));

setupTestLifecycle();

vi.mock("../backlog-repository.ts", async () => {
  const actual =
    await vi.importActual<typeof import("../backlog-repository.ts")>("../backlog-repository.ts");
  return {
    ...actual,
    updateBacklogItem: dataMocks.updateBacklogItem,
  };
});

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "item-1",
    status: "stacked",
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: {
      id: "work-1",
      title: "テスト作品",
      work_type: "movie",
      source_type: "tmdb",
      tmdb_id: 10,
      tmdb_media_type: "movie",
      original_title: null,
      overview: "overview",
      poster_path: null,
      release_date: "2024-01-01",
      runtime_minutes: 120,
      typical_episode_runtime_minutes: null,
      duration_bucket: "long",
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

type RenderOptions = {
  item?: BacklogItem;
  items?: BacklogItem[];
  initialState?: DetailModalState;
};

function DetailModalHarness({
  item,
  items,
  initialState,
  onClose,
  onUpdate,
}: {
  item: BacklogItem;
  items: BacklogItem[];
  initialState: DetailModalState;
  onClose: () => void;
  onUpdate: (item: BacklogItem) => void;
}) {
  const [state, setState] = useState(initialState);
  const [currentItem, setCurrentItem] = useState(item);

  return (
    <DetailModal
      item={currentItem}
      state={state}
      items={items}
      onStateChange={setState}
      onClose={onClose}
      onUpdate={(updated) => {
        setCurrentItem(updated);
        onUpdate(updated);
      }}
    />
  );
}

function renderDetailModal({
  item = createItem(),
  items = [item],
  initialState = createDetailModalState(item.id),
}: RenderOptions = {}) {
  const onClose = vi.fn();
  const onUpdate = vi.fn();
  const user = userEvent.setup();

  render(
    <DetailModalHarness
      item={item}
      items={items}
      initialState={initialState}
      onClose={onClose}
      onUpdate={onUpdate}
    />,
  );

  return { user, onClose, onUpdate };
}

describe("DetailModal", () => {
  beforeEach(() => {
    dataMocks.updateBacklogItem.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("ステータス変更成功時に正しい payload で保存し、onUpdate と state reset が走る", async () => {
    const item = createItem();
    const watchedItem = createItem({
      id: "item-2",
      status: "watched",
      sort_order: 2000,
      works: {
        ...item.works!,
        id: "work-2",
        title: "既存視聴済み作品",
        tmdb_id: 20,
      },
    });

    const { user, onUpdate } = renderDetailModal({
      item,
      items: [item, watchedItem],
      initialState: createDetailModalState(item.id, { message: "古いメッセージ" }),
    });

    expect(screen.getByText("古いメッセージ")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "視聴済み" }));

    await waitFor(() =>
      expect(dataMocks.updateBacklogItem).toHaveBeenCalledWith("item-1", {
        status: "watched",
        sort_order: 3000,
      }),
    );
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "item-1",
        status: "watched",
        sort_order: 3000,
      }),
    );
    await waitFor(() => expect(screen.queryByText("古いメッセージ")).not.toBeInTheDocument());
  });

  test("ステータス変更失敗時はエラーメッセージを表示し、onUpdate しない", async () => {
    dataMocks.updateBacklogItem.mockResolvedValueOnce({ error: "DB error" });

    const { user, onUpdate } = renderDetailModal();

    await user.click(screen.getByRole("button", { name: "視聴済み" }));

    expect(await screen.findByText("更新に失敗しました: DB error")).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  test("note 編集は blur で保存する", async () => {
    const { user, onUpdate } = renderDetailModal();

    await user.click(screen.getByRole("button", { name: "メモを追加" }));

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "あとで見返したい");
    fireEvent.blur(textarea);

    await waitFor(() =>
      expect(dataMocks.updateBacklogItem).toHaveBeenCalledWith("item-1", {
        note: "あとで見返したい",
      }),
    );
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ note: "あとで見返したい" }));
    expect(await screen.findByText("あとで見返したい")).toBeInTheDocument();
  });

  test("note 編集は Ctrl+Enter でも保存する", async () => {
    const { user } = renderDetailModal({
      item: createItem({ note: "既存メモ" }),
    });

    await user.click(screen.getByRole("button", { name: "既存メモ" }));

    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "更新メモ");
    await user.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() =>
      expect(dataMocks.updateBacklogItem).toHaveBeenCalledWith("item-1", {
        note: "更新メモ",
      }),
    );
    expect(await screen.findByText("更新メモ")).toBeInTheDocument();
  });

  test("platform 変更時は即時保存する", async () => {
    const { user, onUpdate } = renderDetailModal();

    await user.click(screen.getByRole("button", { name: "Netflix" }));

    await waitFor(() =>
      expect(dataMocks.updateBacklogItem).toHaveBeenCalledWith("item-1", {
        primary_platform: "netflix",
      }),
    );
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ primary_platform: "netflix" }));
  });

  test("編集中に Escape を押すと編集だけキャンセルし、modal close しない", async () => {
    const { user, onClose } = renderDetailModal();

    await user.click(screen.getByRole("button", { name: "メモを追加" }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "メモを追加" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test("非編集中に Escape を押すと modal close する", async () => {
    const { user, onClose } = renderDetailModal();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
