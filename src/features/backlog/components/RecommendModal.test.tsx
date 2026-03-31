import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogItem } from "../types.ts";
import { RecommendModal } from "./RecommendModal.tsx";

const tmdbMocks = vi.hoisted(() => ({
  fetchMergedRecommendations: vi.fn(),
}));

vi.mock("../../../lib/tmdb.ts", async () => {
  const actual =
    await vi.importActual<typeof import("../../../lib/tmdb.ts")>("../../../lib/tmdb.ts");
  return {
    ...actual,
    fetchMergedRecommendations: tmdbMocks.fetchMergedRecommendations,
  };
});

setupTestLifecycle();

function createRecommendation(
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

function renderRecommendModal(items: BacklogItem[]) {
  const onClose = vi.fn();
  const onAddTmdbWorksToStacked = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();

  render(
    <RecommendModal
      items={items}
      onClose={onClose}
      onAddTmdbWorksToStacked={onAddTmdbWorksToStacked}
    />,
  );

  return { user, onClose, onAddTmdbWorksToStacked };
}

describe("RecommendModal", () => {
  beforeEach(() => {
    tmdbMocks.fetchMergedRecommendations.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("推薦元 item の条件を満たす作品だけで fetch し、結果を backlog/release 条件で絞り込む", async () => {
    const watchedMovie = createItem({
      status: "watched",
      works: {
        ...createItem().works!,
        id: "watched-movie",
        tmdb_id: 11,
        tmdb_media_type: "movie",
        work_type: "movie",
      },
    });
    const watchingSeries = createItem({
      id: "item-2",
      status: "watching",
      works: {
        ...createItem().works!,
        id: "watching-series",
        title: "視聴中シリーズ",
        tmdb_id: 22,
        tmdb_media_type: "tv",
        work_type: "series",
      },
    });
    const stackedItem = createItem({
      id: "item-3",
      status: "stacked",
      works: {
        ...createItem().works!,
        id: "stacked-work",
        tmdb_id: 33,
        tmdb_media_type: "movie",
        work_type: "movie",
      },
    });
    const manualItem = createItem({
      id: "item-4",
      status: "watched",
      works: {
        ...createItem().works!,
        id: "manual-work",
        source_type: "manual",
        tmdb_id: null,
        tmdb_media_type: null,
      },
    });
    const seasonItem = createItem({
      id: "item-5",
      status: "watched",
      works: {
        ...createItem().works!,
        id: "season-work",
        tmdb_id: 44,
        tmdb_media_type: "tv",
        work_type: "season",
        season_number: 2,
      },
    });

    tmdbMocks.fetchMergedRecommendations.mockResolvedValue([
      createRecommendation({ tmdbId: 33, title: "既存 backlog 作品" }),
      createRecommendation({ tmdbId: 101, title: "国内公開映画", hasJapaneseRelease: true }),
      createRecommendation({ tmdbId: 102, title: "未公開映画", hasJapaneseRelease: false }),
      createRecommendation({
        tmdbId: 103,
        tmdbMediaType: "tv",
        workType: "series",
        title: "未公開でも残るシリーズ",
        hasJapaneseRelease: false,
      }),
    ]);

    renderRecommendModal([watchedMovie, watchingSeries, stackedItem, manualItem, seasonItem]);

    await waitFor(() =>
      expect(tmdbMocks.fetchMergedRecommendations).toHaveBeenCalledWith([
        { tmdbId: 11, tmdbMediaType: "movie" },
        { tmdbId: 22, tmdbMediaType: "tv" },
      ]),
    );

    expect(await screen.findByText("国内公開映画")).toBeInTheDocument();
    expect(screen.getByText("未公開でも残るシリーズ")).toBeInTheDocument();
    expect(screen.queryByText("既存 backlog 作品")).not.toBeInTheDocument();
    expect(screen.queryByText("未公開映画")).not.toBeInTheDocument();
  });

  test("checked した作品だけ close 時に追加する", async () => {
    const first = createRecommendation({ tmdbId: 201, title: "候補1" });
    const second = createRecommendation({
      tmdbId: 202,
      tmdbMediaType: "tv",
      workType: "series",
      title: "候補2",
    });
    tmdbMocks.fetchMergedRecommendations.mockResolvedValue([first, second]);

    const sourceItem = createItem({
      status: "watched",
      works: {
        ...createItem().works!,
        tmdb_id: 99,
      },
    });
    const { user, onClose, onAddTmdbWorksToStacked } = renderRecommendModal([sourceItem]);

    expect(await screen.findByText("候補1")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "ストックに追加" })[0]!);

    const backdrop = screen.getByRole("dialog").parentElement;
    if (!backdrop) {
      throw new Error("backdrop not found");
    }
    await user.click(backdrop);

    await waitFor(() => expect(onAddTmdbWorksToStacked).toHaveBeenCalledWith([first]));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("fetch 失敗時でも close でき、追加は発生しない", async () => {
    tmdbMocks.fetchMergedRecommendations.mockRejectedValueOnce(new Error("boom"));

    const sourceItem = createItem({
      status: "watched",
      works: {
        ...createItem().works!,
        tmdb_id: 99,
      },
    });
    const { user, onClose, onAddTmdbWorksToStacked } = renderRecommendModal([sourceItem]);

    expect(await screen.findByText("おすすめが見つかりませんでした")).toBeInTheDocument();

    const backdrop = screen.getByRole("dialog").parentElement;
    if (!backdrop) {
      throw new Error("backdrop not found");
    }
    await user.click(backdrop);

    expect(onAddTmdbWorksToStacked).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
