import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, afterEach, describe, expect, test, vi } from "vite-plus/test";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import type { BacklogItem } from "../types.ts";
import { AddModal } from "./AddModal.tsx";

const tmdbMocks = vi.hoisted(() => ({
  fetchTmdbTrending: vi.fn(),
  searchTmdbWorks: vi.fn(),
  fetchTmdbSeasonOptions: vi.fn(),
}));

const dataMocks = vi.hoisted(() => ({
  resolveSelectedSeasonWorkIds: vi.fn(),
  upsertBacklogItemsToStatus: vi.fn(),
  upsertManualWork: vi.fn(),
  upsertTmdbWork: vi.fn(),
}));

vi.mock("../../../lib/tmdb.ts", async () => {
  const actual =
    await vi.importActual<typeof import("../../../lib/tmdb.ts")>("../../../lib/tmdb.ts");
  return {
    ...actual,
    fetchTmdbTrending: tmdbMocks.fetchTmdbTrending,
    searchTmdbWorks: tmdbMocks.searchTmdbWorks,
    fetchTmdbSeasonOptions: tmdbMocks.fetchTmdbSeasonOptions,
  };
});

vi.mock("../data.ts", async () => {
  const actual = await vi.importActual<typeof import("../data.ts")>("../data.ts");
  return {
    ...actual,
    resolveSelectedSeasonWorkIds: dataMocks.resolveSelectedSeasonWorkIds,
    upsertBacklogItemsToStatus: dataMocks.upsertBacklogItemsToStatus,
    upsertManualWork: dataMocks.upsertManualWork,
    upsertTmdbWork: dataMocks.upsertTmdbWork,
  };
});

function createSearchResult(
  overrides: Partial<TmdbSearchResult> & Pick<TmdbSearchResult, "tmdbId" | "title">,
): TmdbSearchResult {
  return {
    tmdbId: overrides.tmdbId,
    tmdbMediaType: "movie",
    workType: "movie",
    title: overrides.title,
    originalTitle: null,
    overview: null,
    posterPath: null,
    releaseDate: "2024-01-01",
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
    ...overrides,
  };
}

function createSeasonOption(
  overrides: Partial<TmdbSeasonOption> & Pick<TmdbSeasonOption, "seasonNumber" | "title">,
): TmdbSeasonOption {
  return {
    seasonNumber: overrides.seasonNumber,
    title: overrides.title,
    overview: null,
    posterPath: null,
    releaseDate: "2024-01-01",
    episodeCount: 8,
    ...overrides,
  };
}

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return {
    id: "item-1",
    status: "stacked",
    primary_platform: null,
    note: null,
    sort_order: 1000,
    works: {
      id: "work-1",
      title: "既存作品",
      work_type: "movie",
      source_type: "tmdb",
      tmdb_id: 1,
      tmdb_media_type: "movie",
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
    },
    ...overrides,
  };
}

type RenderOptions = {
  items?: BacklogItem[];
};

function renderAddModal({ items = [] }: RenderOptions = {}) {
  const onClose = vi.fn();
  const onAdded = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(
    <AddModal
      items={items}
      session={{ user: { id: "user-1" } } as Session}
      onClose={onClose}
      onAdded={onAdded}
    />,
  );

  return { user, onClose, onAdded };
}

async function search(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.clear(screen.getByPlaceholderText("作品名で検索"));
  await user.type(screen.getByPlaceholderText("作品名で検索"), query);
  await waitFor(() => expect(tmdbMocks.searchTmdbWorks).toHaveBeenCalledWith(query));
}

describe("AddModal", () => {
  beforeEach(() => {
    tmdbMocks.fetchTmdbTrending.mockResolvedValue([]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([]);
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([]);
    dataMocks.resolveSelectedSeasonWorkIds.mockResolvedValue({ error: null, workIds: [] });
    dataMocks.upsertBacklogItemsToStatus.mockResolvedValue({ error: null });
    dataMocks.upsertManualWork.mockResolvedValue({
      data: { id: "manual-work-1" },
      error: null,
    });
    dataMocks.upsertTmdbWork.mockResolvedValue({
      data: { id: "tmdb-work-1" },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("空検索では trending、入力後は search results を表示し、映画選択ではシーズン UI を出さない", async () => {
    const trendingResult = createSearchResult({ tmdbId: 10, title: "トレンド映画" });
    const searchResult = createSearchResult({ tmdbId: 20, title: "検索映画" });
    tmdbMocks.fetchTmdbTrending.mockResolvedValue([trendingResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([searchResult]);

    const { user } = renderAddModal();

    expect(await screen.findByRole("button", { name: /トレンド映画/ })).toBeInTheDocument();

    await search(user, "検索映画");

    expect(await screen.findByRole("button", { name: /検索映画/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /トレンド映画/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /検索映画/ }));

    expect(screen.getByLabelText("タイトル")).toHaveValue("検索映画");
    expect(screen.queryByRole("button", { name: "シーズン1" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "追加する" })).toHaveLength(1);
  });

  test("TV 選択時はシーズン1を初期選択し、取得後のシーズン候補と重複通知を表示する", async () => {
    const seriesResult = createSearchResult({
      tmdbId: 30,
      tmdbMediaType: "tv",
      workType: "series",
      title: "テストシリーズ",
    });
    const duplicateItem = createItem({
      status: "watched",
      works: {
        ...createItem().works!,
        id: "series-work-1",
        title: "テストシリーズ",
        work_type: "series",
        tmdb_id: 30,
        tmdb_media_type: "tv",
      },
    });
    tmdbMocks.fetchTmdbTrending.mockResolvedValue([seriesResult]);
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([
      createSeasonOption({ seasonNumber: 2, title: "テストシリーズ シーズン2" }),
    ]);

    const { user } = renderAddModal({ items: [duplicateItem] });

    await user.click(await screen.findByRole("button", { name: /テストシリーズ/ }));

    await waitFor(() =>
      expect(tmdbMocks.fetchTmdbSeasonOptions).toHaveBeenCalledWith(seriesResult),
    );
    expect(screen.getByRole("button", { name: "シーズン1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByRole("button", { name: /シーズン2/ })).toBeInTheDocument();
    expect(
      screen.getByText("シーズン1はすでに「視聴済み」にあります。追加するとストックに戻せます。"),
    ).toBeInTheDocument();
  });

  test("confirm をキャンセルすると追加せずメッセージを表示する", async () => {
    const movieResult = createSearchResult({ tmdbId: 40, title: "既存映画" });
    const duplicateItem = createItem({
      status: "watched",
      works: {
        ...createItem().works!,
        id: "existing-work-1",
        title: "既存映画",
        tmdb_id: 40,
        tmdb_media_type: "movie",
      },
    });
    tmdbMocks.fetchTmdbTrending.mockResolvedValue([movieResult]);
    dataMocks.upsertTmdbWork.mockResolvedValue({
      data: { id: "existing-work-1" },
      error: null,
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    const { user, onAdded, onClose } = renderAddModal({ items: [duplicateItem] });

    await user.click(await screen.findByRole("button", { name: /既存映画/ }));
    await user.click(screen.getByRole("button", { name: "追加する" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "「既存映画」はすでに「視聴済み」にあります。ストックに戻しますか？",
    );
    expect(await screen.findByText("既存カードはそのままにしました。")).toBeInTheDocument();
    expect(dataMocks.upsertBacklogItemsToStatus).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  test("手動追加では upsertManualWork を使って保存する", async () => {
    const { user, onAdded, onClose } = renderAddModal();

    await user.type(screen.getByLabelText("タイトル"), "手動作品");
    await user.click(screen.getByRole("button", { name: "追加する" }));

    expect(dataMocks.upsertManualWork).toHaveBeenCalledWith("手動作品", "movie", "user-1");
    expect(dataMocks.upsertTmdbWork).not.toHaveBeenCalled();
    expect(dataMocks.upsertBacklogItemsToStatus).toHaveBeenCalledWith(
      "user-1",
      [],
      ["manual-work-1"],
      "stacked",
      { note: null, primaryPlatform: null },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  test("TMDb 作品追加では upsertTmdbWork を使って保存する", async () => {
    const movieResult = createSearchResult({ tmdbId: 50, title: "TMDb映画" });
    tmdbMocks.fetchTmdbTrending.mockResolvedValue([movieResult]);

    const { user, onAdded, onClose } = renderAddModal();

    await user.click(await screen.findByRole("button", { name: /TMDb映画/ }));
    await user.click(screen.getByRole("button", { name: "追加する" }));

    expect(dataMocks.upsertTmdbWork).toHaveBeenCalledWith(movieResult, "user-1");
    expect(dataMocks.upsertManualWork).not.toHaveBeenCalled();
    expect(dataMocks.upsertBacklogItemsToStatus).toHaveBeenCalledWith(
      "user-1",
      [],
      ["tmdb-work-1"],
      "stacked",
      { note: null, primaryPlatform: null },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });
});
