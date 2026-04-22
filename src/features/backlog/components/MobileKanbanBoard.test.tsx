import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import type { BacklogStatus } from "../types.ts";
import type { KanbanColumnProps } from "./kanban-board-shared.ts";
import { MobileKanbanBoard } from "./MobileKanbanBoard.tsx";

vi.mock("./KanbanColumn.tsx", () => ({
  KanbanColumn: ({ status, extra }: { status: string; extra?: React.ReactNode }) => (
    <div>
      <div>{`column:${status}`}</div>
      {extra}
    </div>
  ),
}));

setupTestLifecycle();

function createColumnProps(status: BacklogStatus): KanbanColumnProps {
  return {
    status,
    items: [],
    activeViewingMode: null,
    isMobileLayout: true,
    onOpenAddModal: vi.fn(),
    onOpenDetail: vi.fn(),
    onDeleteItem: vi.fn(),
    onMarkAsWatched: vi.fn(),
  };
}

function renderBoard(overrides: Partial<React.ComponentProps<typeof MobileKanbanBoard>> = {}) {
  const onTabChange = vi.fn();
  const getColumnProps = vi.fn((status: BacklogStatus) => createColumnProps(status));
  const columnRef = vi.fn();

  const result = render(
    <MobileKanbanBoard
      selectedTabStatus="stacked"
      isMobileDragging={false}
      onTabChange={onTabChange}
      getColumnProps={getColumnProps}
      columnRef={columnRef}
      {...overrides}
    />,
  );

  return { onTabChange, getColumnProps, columnRef, ...result };
}

describe("MobileKanbanBoard", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test("選択中タブを scrollIntoView し、対応する column を描画する", () => {
    const { getColumnProps, columnRef } = renderBoard();

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    expect(screen.getByText("column:stacked")).toBeInTheDocument();
    expect(getColumnProps).toHaveBeenCalledWith("stacked");
    expect(columnRef).toHaveBeenCalledWith("stacked", expect.any(HTMLElement));
  });

  test("タブ押下で対象 status に切り替える", async () => {
    const user = userEvent.setup();
    const { onTabChange } = renderBoard();

    await user.click(screen.getByRole("tab", { name: "視聴中" }));

    expect(onTabChange).toHaveBeenCalledWith("watching");
  });

  test("左スワイプで次のタブへ移動する", () => {
    const { onTabChange } = renderBoard();
    const content = document.querySelector(".board-tab-content");
    if (!content) throw new Error("tab content not found");

    fireEvent.touchStart(content, {
      touches: [{ clientX: 120, clientY: 20 }],
    });
    fireEvent.touchEnd(content, {
      changedTouches: [{ clientX: 20, clientY: 24 }],
    });

    expect(onTabChange).toHaveBeenCalledWith("want_to_watch");
  });

  test("右スワイプで前のタブへ移動する", () => {
    const { onTabChange } = renderBoard({ selectedTabStatus: "watching" });
    const content = document.querySelector(".board-tab-content");
    if (!content) throw new Error("tab content not found");

    fireEvent.touchStart(content, {
      touches: [{ clientX: 20, clientY: 24 }],
    });
    fireEvent.touchEnd(content, {
      changedTouches: [{ clientX: 120, clientY: 20 }],
    });

    expect(onTabChange).toHaveBeenCalledWith("want_to_watch");
  });

  test("短すぎるスワイプではタブを切り替えない", () => {
    const { onTabChange } = renderBoard();
    const content = document.querySelector(".board-tab-content");
    if (!content) throw new Error("tab content not found");

    fireEvent.touchStart(content, {
      touches: [{ clientX: 120, clientY: 20 }],
    });
    fireEvent.touchEnd(content, {
      changedTouches: [{ clientX: 80, clientY: 24 }],
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });

  test("縦方向の移動が大きい場合はタブを切り替えない", () => {
    const { onTabChange } = renderBoard();
    const content = document.querySelector(".board-tab-content");
    if (!content) throw new Error("tab content not found");

    fireEvent.touchStart(content, {
      touches: [{ clientX: 120, clientY: 20 }],
    });
    fireEvent.touchEnd(content, {
      changedTouches: [{ clientX: 20, clientY: 160 }],
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });

  test("ドラッグ中はスワイプしてもタブを切り替えない", () => {
    const { onTabChange } = renderBoard({ isMobileDragging: true });
    const content = document.querySelector(".board-tab-content");
    if (!content) throw new Error("tab content not found");

    fireEvent.touchStart(content, {
      touches: [{ clientX: 120, clientY: 20 }],
    });
    fireEvent.touchEnd(content, {
      changedTouches: [{ clientX: 20, clientY: 24 }],
    });

    expect(onTabChange).not.toHaveBeenCalled();
  });

  test("スクロール中は class を付け、1秒後に外す", () => {
    vi.useFakeTimers();
    renderBoard();
    const content = document.querySelector(".board-tab-content");
    if (!content) throw new Error("tab content not found");

    fireEvent.scroll(content);
    expect(content).toHaveClass("is-scrolling");

    vi.advanceTimersByTime(1000);

    expect(content).not.toHaveClass("is-scrolling");
  });
});
