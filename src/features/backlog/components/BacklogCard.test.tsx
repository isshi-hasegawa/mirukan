import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem } from "../types.ts";
import { BacklogCard } from "./BacklogCard.tsx";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

setupTestLifecycle();

function createItem(): BacklogItem {
  return {
    id: "item-1",
    status: "watching",
    primary_platform: null,
    note: "メモあり",
    sort_order: 1000,
    works: {
      id: "work-1",
      title: "テスト作品",
      work_type: "movie",
      source_type: "manual",
      tmdb_id: null,
      tmdb_media_type: null,
      original_title: null,
      overview: null,
      poster_path: null,
      release_date: "2024-01-01",
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
  };
}

type RenderResult = {
  onOpenDetail: ReturnType<typeof vi.fn>;
  onDeleteItem: ReturnType<typeof vi.fn>;
  onMarkAsWatched: ReturnType<typeof vi.fn>;
  user: ReturnType<typeof userEvent.setup>;
};

async function renderCard(): Promise<RenderResult> {
  const onOpenDetail = vi.fn();
  const onDeleteItem = vi.fn();
  const onMarkAsWatched = vi.fn();
  const user = userEvent.setup();

  render(
    <BacklogCard
      item={createItem()}
      onOpenDetail={onOpenDetail}
      onDeleteItem={onDeleteItem}
      onMarkAsWatched={onMarkAsWatched}
    />,
  );

  await user.click(screen.getByRole("button", { name: "カードメニューを開く" }));

  return {
    onOpenDetail,
    onDeleteItem,
    onMarkAsWatched,
    user,
  };
}

describe("BacklogCard", () => {
  test("メニューを開いても詳細は開かない", async () => {
    const { onOpenDetail } = await renderCard();

    expect(await screen.findByRole("menuitem", { name: "視聴済み" })).toBeInTheDocument();
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  test("視聴済み押下で onMarkAsWatched を呼ぶ", async () => {
    const { onMarkAsWatched, onOpenDetail, user } = await renderCard();

    await user.click(await screen.findByRole("menuitem", { name: "視聴済み" }));

    expect(onMarkAsWatched).toHaveBeenCalledWith("item-1");
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  test("削除押下で onDeleteItem を呼ぶ", async () => {
    const { onDeleteItem, onOpenDetail, user } = await renderCard();

    await user.click(await screen.findByRole("menuitem", { name: "削除" }));

    expect(onDeleteItem).toHaveBeenCalledWith("item-1");
    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});
