import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Session } from "@supabase/supabase-js";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { createBacklogItem } from "../../../test/backlog-fixtures.ts";
import type { BacklogItem } from "../types.ts";
import { useAddSubmit } from "./useAddSubmit.ts";

const dataMocks = vi.hoisted(() => ({
  upsertBacklogItemsToStatus: vi.fn(),
  upsertManualWork: vi.fn(),
  upsertTmdbWork: vi.fn(),
  resolveSelectedSeasonWorkIds: vi.fn(),
}));

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
    upsertManualWork: dataMocks.upsertManualWork,
    upsertTmdbWork: dataMocks.upsertTmdbWork,
    resolveSelectedSeasonWorkIds: dataMocks.resolveSelectedSeasonWorkIds,
  };
});

setupTestLifecycle();

function createItem(overrides: Partial<BacklogItem> = {}): BacklogItem {
  return createBacklogItem(overrides, { title: "作品1" });
}

type HarnessProps = {
  items?: BacklogItem[];
  resolvedTitle?: string;
  isTvSelection?: boolean;
  selectedSeasonNumbers?: number[];
  onClose?: () => void;
  onAdded?: () => void | Promise<void>;
};

function HookHarness({
  items = [],
  resolvedTitle = "",
  isTvSelection = false,
  selectedSeasonNumbers = [],
  onClose = vi.fn(),
  onAdded = vi.fn(),
}: HarnessProps) {
  const {
    formMessage,
    pendingSaveMessage,
    clearSubmissionState,
    cancelPendingSave,
    confirmPendingSave,
    handleSubmit,
  } = useAddSubmit({
    items,
    session: { user: { id: "user-1" } } as Session,
    selectedTmdbResult: null,
    selectedSeasonNumbers,
    seasonOptions: [],
    isTvSelection,
    resolvedTitle,
    resolvedWorkType: "movie",
    primaryPlatform: null,
    note: "",
    onClose,
    onAdded,
  });

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      {formMessage && <p data-testid="form-message">{formMessage}</p>}
      {pendingSaveMessage && <p data-testid="pending-save-message">{pendingSaveMessage}</p>}
      <button type="submit">送信</button>
      <button type="button" onClick={clearSubmissionState}>
        クリア
      </button>
      <button type="button" onClick={cancelPendingSave}>
        キャンセル
      </button>
      <button type="button" onClick={() => void confirmPendingSave()}>
        確認
      </button>
    </form>
  );
}

describe("useAddSubmit", () => {
  beforeEach(() => {
    dataMocks.upsertManualWork.mockResolvedValue({ data: { id: "work-new" }, error: null });
    dataMocks.upsertTmdbWork.mockResolvedValue({ data: { id: "tmdb-work-1" }, error: null });
    dataMocks.upsertBacklogItemsToStatus.mockResolvedValue({ error: null });
    dataMocks.resolveSelectedSeasonWorkIds.mockResolvedValue({ workIds: [], error: null });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("タイトルが空のまま送信するとバリデーションメッセージを出す", async () => {
    const user = userEvent.setup();
    render(<HookHarness resolvedTitle="   " />);

    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByTestId("form-message")).toHaveTextContent(
      "タイトルを入力してください。",
    );
    expect(dataMocks.upsertManualWork).not.toHaveBeenCalled();
  });

  test("TV 選択でシーズン未選択のまま送信するとバリデーションメッセージを出す", async () => {
    const user = userEvent.setup();
    render(
      <HookHarness
        resolvedTitle="テストシリーズ"
        isTvSelection={true}
        selectedSeasonNumbers={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByTestId("form-message")).toHaveTextContent(
      "追加するシーズンを1つ以上選択してください。",
    );
    expect(dataMocks.resolveSelectedSeasonWorkIds).not.toHaveBeenCalled();
  });

  test("clearSubmissionState でフォームメッセージをクリアする", async () => {
    const user = userEvent.setup();
    render(<HookHarness resolvedTitle="   " />);

    await user.click(screen.getByRole("button", { name: "送信" }));
    expect(await screen.findByTestId("form-message")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "クリア" }));

    await waitFor(() => expect(screen.queryByTestId("form-message")).not.toBeInTheDocument());
  });

  test("upsertBacklogItemsToStatus エラー時はエラーメッセージを表示してモーダルを閉じない", async () => {
    dataMocks.upsertBacklogItemsToStatus.mockResolvedValueOnce({ error: "保存失敗" });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<HookHarness resolvedTitle="手動作品" onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByTestId("form-message")).toHaveTextContent(
      "カードの保存に失敗しました: 保存失敗",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  test("pendingSave 中に cancelPendingSave を呼ぶと pending メッセージが消える", async () => {
    const watchedItem = createItem({
      id: "item-watched",
      status: "watched",
      works: {
        ...createItem().works!,
        id: "work-watched",
        tmdb_id: 99,
        tmdb_media_type: "movie",
        work_type: "movie",
      },
    });
    dataMocks.upsertManualWork.mockResolvedValue({ data: { id: "work-watched" }, error: null });

    const user = userEvent.setup();
    render(<HookHarness items={[watchedItem]} resolvedTitle="既存作品" />);

    await user.click(screen.getByRole("button", { name: "送信" }));

    await waitFor(() => expect(screen.queryByTestId("pending-save-message")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() =>
      expect(screen.queryByTestId("pending-save-message")).not.toBeInTheDocument(),
    );
    expect(dataMocks.upsertBacklogItemsToStatus).not.toHaveBeenCalled();
  });
});
