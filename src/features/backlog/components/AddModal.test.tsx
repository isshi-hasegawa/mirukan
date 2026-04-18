import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import type { TmdbSearchResult, TmdbSeasonOption } from "../../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createWorkSummary } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { AddModal } from "./AddModal.tsx";

const tmdbMocks = vi.hoisted(() => ({
  fetchTmdbRecommendations: vi.fn(),
  searchTmdbWorks: vi.fn(),
  fetchTmdbSeasonOptions: vi.fn(),
  suggestDisplayTitle: vi.fn(),
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
    fetchTmdbRecommendations: tmdbMocks.fetchTmdbRecommendations,
    searchTmdbWorks: tmdbMocks.searchTmdbWorks,
    fetchTmdbSeasonOptions: tmdbMocks.fetchTmdbSeasonOptions,
    suggestDisplayTitle: tmdbMocks.suggestDisplayTitle,
  };
});

vi.mock("../backlog-repository.ts", async () => {
  const actual = await vi.importActual<typeof import("../backlog-repository.ts")>(
    "../backlog-repository.ts",
  );
  return {
    ...actual,
    upsertBacklogItemsToStatus: dataMocks.upsertBacklogItemsToStatus,
  };
});

vi.mock("../work-repository.ts", async () => {
  const actual =
    await vi.importActual<typeof import("../work-repository.ts")>("../work-repository.ts");
  return {
    ...actual,
    resolveSelectedSeasonWorkIds: dataMocks.resolveSelectedSeasonWorkIds,
    upsertManualWork: dataMocks.upsertManualWork,
    upsertTmdbWork: dataMocks.upsertTmdbWork,
  };
});

setupTestLifecycle();

function createSearchResult(
  overrides: Partial<TmdbSearchResult> & Pick<TmdbSearchResult, "tmdbId" | "title">,
): TmdbSearchResult {
  return {
    tmdbMediaType: "movie",
    workType: "movie",
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
    works: createWorkSummary({ title: "既存作品", release_date: "2024-01-01" }),
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

  const view = render(
    <AddModal
      items={items}
      session={{ user: { id: "user-1" } } as Session}
      onClose={onClose}
      onAdded={onAdded}
    />,
  );

  return { user, onClose, onAdded, ...view };
}

async function search(query: string) {
  fireEvent.change(screen.getByPlaceholderText("作品名で検索"), {
    target: { value: query },
  });
  await waitFor(() => expect(tmdbMocks.searchTmdbWorks).toHaveBeenCalledWith(query));
}

describe("AddModal", () => {
  beforeEach(() => {
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([]);
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([]);
    tmdbMocks.suggestDisplayTitle.mockResolvedValue(null);
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
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([trendingResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([searchResult]);

    const { user } = renderAddModal();

    expect(await screen.findByRole("button", { name: /トレンド映画/ })).toBeInTheDocument();

    await search("検索映画");

    expect(await screen.findByRole("button", { name: /検索映画/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /トレンド映画/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /検索映画/ }));

    expect(screen.getByLabelText("タイトル")).toHaveValue("検索映画");
    expect(screen.queryByRole("button", { name: "シーズン1" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "ストックに追加" })).toHaveLength(1);
    expect(document.querySelector('[data-footer-layout="inline"]')).toBeInTheDocument();
    expect(document.querySelector('[data-footer-layout="panel"]')).not.toBeInTheDocument();
  }, 10_000);

  test("検索結果とおすすめは日本語情報がある作品を優先表示する", async () => {
    const originalOnlyResult = createSearchResult({
      tmdbId: 30,
      title: "Original Only",
      originalTitle: "Original Only",
      overview: null,
    });
    const localizedResult = createSearchResult({
      tmdbId: 31,
      title: "邦題あり作品",
      originalTitle: "Localized Work",
      overview: "日本語のあらすじ",
    });

    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([originalOnlyResult, localizedResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([originalOnlyResult, localizedResult]);

    renderAddModal();

    const recommendedOriginal = await screen.findByRole("button", { name: /Original Only/ });
    const recommendedLocalized = await screen.findByRole("button", { name: /邦題あり作品/ });

    expect(
      recommendedLocalized.compareDocumentPosition(recommendedOriginal) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    await search("test");

    const searchedOriginal = await screen.findByRole("button", { name: /Original Only/ });
    const searchedLocalized = await screen.findByRole("button", { name: /邦題あり作品/ });

    expect(
      searchedLocalized.compareDocumentPosition(searchedOriginal) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test("初期おすすめでは既存作品を除外し、検索では未追加シーズンがあるシリーズを表示する", async () => {
    const stackedMovieResult = createSearchResult({ tmdbId: 11, title: "ストック済み映画" });
    const stackedSeriesResult = createSearchResult({
      tmdbId: 12,
      tmdbMediaType: "tv",
      workType: "series",
      title: "ストック済みシリーズ",
    });
    const stackedMovieItem = createItem({
      works: {
        ...createItem().works!,
        id: "stacked-movie-work",
        title: "ストック済み映画",
        tmdb_id: 11,
        tmdb_media_type: "movie",
        work_type: "movie",
      },
    });
    const stackedSeriesItem = createItem({
      id: "item-2",
      works: {
        ...createItem().works!,
        id: "stacked-series-work",
        title: "ストック済みシリーズ",
        tmdb_id: 12,
        tmdb_media_type: "tv",
        work_type: "series",
        season_count: 2,
      },
    });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([stackedMovieResult, stackedSeriesResult]);
    tmdbMocks.searchTmdbWorks.mockImplementation(async (query: string) =>
      query.includes("映画") ? [stackedMovieResult] : [stackedSeriesResult],
    );

    renderAddModal({ items: [stackedMovieItem, stackedSeriesItem] });

    expect(
      await screen.findByText("おすすめ候補が見つかりませんでした。作品名で検索できます。"),
    ).toBeInTheDocument();

    await search("ストック済み映画");

    expect(screen.queryByRole("button", { name: /ストック済み映画/ })).not.toBeInTheDocument();
    expect(
      screen.getByText("すでにストック済みの作品は候補から除外しています。"),
    ).toBeInTheDocument();

    await search("ストック済みシリーズ");

    expect(await screen.findByRole("button", { name: /ストック済みシリーズ/ })).toBeInTheDocument();
  });

  test("全シーズンストック済みのシリーズは候補から除外する", async () => {
    const fullyStackedSeriesResult = createSearchResult({
      tmdbId: 13,
      tmdbMediaType: "tv",
      workType: "series",
      title: "全シーズン済みシリーズ",
    });
    const stackedSeriesItem = createItem({
      works: {
        ...createItem().works!,
        id: "stacked-series-root-work",
        title: "全シーズン済みシリーズ",
        tmdb_id: 13,
        tmdb_media_type: "tv",
        work_type: "series",
        season_count: 2,
      },
    });
    const stackedSeasonItem = createItem({
      id: "item-2",
      works: {
        ...createItem().works!,
        id: "stacked-series-season-work",
        title: "全シーズン済みシリーズ シーズン2",
        tmdb_id: 13,
        tmdb_media_type: "tv",
        work_type: "season",
        season_number: 2,
      },
    });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([fullyStackedSeriesResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([fullyStackedSeriesResult]);

    renderAddModal({ items: [stackedSeriesItem, stackedSeasonItem] });

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /全シーズン済みシリーズ/ }),
      ).not.toBeInTheDocument(),
    );

    await search("全シーズン済みシリーズ");

    expect(
      screen.queryByRole("button", { name: /全シーズン済みシリーズ/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("すでにストック済みの作品は候補から除外しています。"),
    ).toBeInTheDocument();
  });

  test("TV 選択時はシーズン1を初期選択し、取得後のシーズン候補を表示する", async () => {
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
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([seriesResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([seriesResult]);
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([
      createSeasonOption({ seasonNumber: 2, title: "テストシリーズ シーズン2" }),
    ]);

    const { user } = renderAddModal({ items: [duplicateItem] });

    await search("テストシリーズ");
    await user.click(await screen.findByRole("button", { name: /テストシリーズ/ }));

    await waitFor(() =>
      expect(tmdbMocks.fetchTmdbSeasonOptions).toHaveBeenCalledWith(seriesResult),
    );
    expect(screen.getByRole("button", { name: "シーズン1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await screen.findByRole("button", { name: /シーズン2/ })).toBeInTheDocument();
  });

  test("すでにストック済みのシーズンだけを選んだときは追加ボタンを無効化する", async () => {
    const seriesResult = createSearchResult({
      tmdbId: 31,
      tmdbMediaType: "tv",
      workType: "series",
      title: "ストック済みシリーズ",
    });
    const duplicateItem = createItem({
      works: {
        ...createItem().works!,
        id: "series-work-31",
        title: "ストック済みシリーズ",
        work_type: "series",
        tmdb_id: 31,
        tmdb_media_type: "tv",
      },
    });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([seriesResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([seriesResult]);
    tmdbMocks.fetchTmdbSeasonOptions.mockResolvedValue([
      createSeasonOption({ seasonNumber: 2, title: "ストック済みシリーズ シーズン2" }),
    ]);

    const { user } = renderAddModal({ items: [duplicateItem] });

    await search("ストック済みシリーズ");
    await user.click(await screen.findByRole("button", { name: /ストック済みシリーズ/ }));

    expect(screen.getByRole("button", { name: "シーズン1" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /シーズン2/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "ストック済み" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "ストックに追加" })).not.toBeInTheDocument();
  });

  test("重複作品の追加ではモーダル内で戻すかどうかを選べる", async () => {
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
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([movieResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([movieResult]);
    dataMocks.upsertTmdbWork.mockResolvedValue({
      data: { id: "existing-work-1" },
      error: null,
    });

    const { user, onAdded, onClose } = renderAddModal({ items: [duplicateItem] });

    await search("既存映画");
    await user.click(await screen.findByRole("button", { name: /既存映画/ }));
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));

    expect(
      await screen.findByText("「既存映画」はすでに「鑑賞済み」にあります。ストックに戻しますか？"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ストックへ戻す" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ストックに追加" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() =>
      expect(
        screen.queryByText("「既存映画」はすでに「鑑賞済み」にあります。ストックに戻しますか？"),
      ).not.toBeInTheDocument(),
    );
    expect(dataMocks.upsertBacklogItemsToStatus).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });

  test("重複作品の追加でストックへ戻すと保存する", async () => {
    const movieResult = createSearchResult({ tmdbId: 41, title: "別既存映画" });
    const duplicateItem = createItem({
      status: "watched",
      works: {
        ...createItem().works!,
        id: "existing-work-41",
        title: "別既存映画",
        tmdb_id: 41,
        tmdb_media_type: "movie",
      },
    });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([movieResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([movieResult]);
    dataMocks.upsertTmdbWork.mockResolvedValue({
      data: { id: "existing-work-41" },
      error: null,
    });

    const { user, onAdded, onClose } = renderAddModal({ items: [duplicateItem] });

    await search("別既存映画");
    await user.click(await screen.findByRole("button", { name: /別既存映画/ }));
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));

    expect(
      await screen.findByText(
        "「別既存映画」はすでに「鑑賞済み」にあります。ストックに戻しますか？",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ストックに追加" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ストックへ戻す" }));

    await waitFor(() =>
      expect(dataMocks.upsertBacklogItemsToStatus).toHaveBeenCalledWith(
        "user-1",
        [duplicateItem],
        ["existing-work-41"],
        "stacked",
        { display_title: null, note: null, primary_platform: null },
      ),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  test("重複作品の追加では browser confirm を使わない", async () => {
    const movieResult = createSearchResult({ tmdbId: 42, title: "confirm不要映画" });
    const duplicateItem = createItem({
      status: "watched",
      works: {
        ...createItem().works!,
        id: "existing-work-42",
        title: "confirm不要映画",
        tmdb_id: 42,
        tmdb_media_type: "movie",
      },
    });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([movieResult]);
    tmdbMocks.searchTmdbWorks.mockResolvedValue([movieResult]);
    dataMocks.upsertTmdbWork.mockResolvedValue({
      data: { id: "existing-work-42" },
      error: null,
    });
    const confirmSpy = vi.spyOn(globalThis, "confirm");

    const { user } = renderAddModal({ items: [duplicateItem] });

    await search("confirm不要映画");
    await user.click(await screen.findByRole("button", { name: /confirm不要映画/ }));
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));

    expect(
      await screen.findByText(
        "「confirm不要映画」はすでに「鑑賞済み」にあります。ストックに戻しますか？",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ストックに追加" })).not.toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test("手動追加のエラーメッセージは入力開始でクリアする", async () => {
    const { user } = renderAddModal();

    await user.type(screen.getByLabelText("タイトル"), "   ");
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));
    expect(await screen.findByText("タイトルを入力してください。")).toBeInTheDocument();

    await user.type(screen.getByLabelText("タイトル"), "手");

    await waitFor(() =>
      expect(screen.queryByText("タイトルを入力してください。")).not.toBeInTheDocument(),
    );
  });

  test("手動追加のエラーメッセージは TMDb 選択へ切り替えるとクリアする", async () => {
    const movieResult = createSearchResult({ tmdbId: 42, title: "切替映画" });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([movieResult]);

    const { user } = renderAddModal();

    await user.type(screen.getByLabelText("タイトル"), "   ");
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));
    expect(await screen.findByText("タイトルを入力してください。")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /切替映画/ }));

    await waitFor(() =>
      expect(screen.queryByText("タイトルを入力してください。")).not.toBeInTheDocument(),
    );
  });

  test("手動追加では upsertManualWork を使って保存する", async () => {
    const { user, onAdded, onClose } = renderAddModal();

    await user.type(screen.getByLabelText("タイトル"), "手動作品");
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));

    expect(dataMocks.upsertManualWork).toHaveBeenCalledWith("手動作品", "movie", "user-1");
    expect(dataMocks.upsertTmdbWork).not.toHaveBeenCalled();
    expect(dataMocks.upsertBacklogItemsToStatus).toHaveBeenCalledWith(
      "user-1",
      [],
      ["manual-work-1"],
      "stacked",
      { display_title: null, note: null, primary_platform: null },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  test("TMDb 作品追加では upsertTmdbWork を使って保存する", async () => {
    const movieResult = createSearchResult({ tmdbId: 50, title: "TMDb映画" });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([movieResult]);

    const { user, onAdded, onClose } = renderAddModal();

    await user.click(await screen.findByRole("button", { name: /TMDb映画/ }));
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));

    expect(dataMocks.upsertTmdbWork).toHaveBeenCalledWith(movieResult, "user-1");
    expect(dataMocks.upsertManualWork).not.toHaveBeenCalled();
    expect(dataMocks.upsertBacklogItemsToStatus).toHaveBeenCalledWith(
      "user-1",
      [],
      ["tmdb-work-1"],
      "stacked",
      { display_title: null, note: null, primary_platform: null },
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdded).toHaveBeenCalledTimes(1);
  });

  test("英語タイトルのみの TMDb 作品では日本語提案をタイトル欄に反映して保存する", async () => {
    const movieResult = createSearchResult({
      tmdbId: 51,
      title: "Original Only",
      originalTitle: "Original Only",
    });
    tmdbMocks.fetchTmdbRecommendations.mockResolvedValue([movieResult]);
    tmdbMocks.suggestDisplayTitle.mockResolvedValue("邦題候補");

    const { user } = renderAddModal();

    await user.click(await screen.findByRole("button", { name: /Original Only/ }));

    await waitFor(() =>
      expect(tmdbMocks.suggestDisplayTitle).toHaveBeenCalledWith({
        title: "Original Only",
        originalTitle: "Original Only",
        workType: "movie",
      }),
    );
    expect(screen.getByLabelText("タイトル")).toHaveValue("邦題候補");

    await user.click(screen.getByRole("button", { name: "ストックに追加" }));

    expect(dataMocks.upsertBacklogItemsToStatus).toHaveBeenCalledWith(
      "user-1",
      [],
      ["tmdb-work-1"],
      "stacked",
      { display_title: "邦題候補", note: null, primary_platform: null },
    );
  });

  test("カード保存失敗時はエラーメッセージを出してモーダルを閉じない", async () => {
    dataMocks.upsertBacklogItemsToStatus.mockResolvedValueOnce({ error: "duplicate row" });

    const { user, onAdded, onClose } = renderAddModal();

    await user.type(screen.getByLabelText("タイトル"), "失敗作品");
    await user.click(screen.getByRole("button", { name: "ストックに追加" }));

    expect(
      await screen.findByText("カードの保存に失敗しました: duplicate row"),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
  });
});
