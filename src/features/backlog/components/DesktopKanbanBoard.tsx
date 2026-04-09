import type { BacklogStatus } from "../types.ts";
import { statusOrder } from "../constants.ts";
import { KanbanColumn } from "./KanbanColumn.tsx";
import type { KanbanColumnProps } from "./kanban-board-shared.ts";

type Props = {
  getColumnProps: (status: BacklogStatus) => KanbanColumnProps;
  columnRef: (status: BacklogStatus, el: HTMLElement | null) => void;
};

export function DesktopKanbanBoard({ getColumnProps, columnRef }: Props) {
  return (
    <section className="mt-3 grid min-w-0 max-w-full min-h-0 grid-cols-[minmax(280px,1.35fr)_repeat(4,minmax(220px,1fr))] items-stretch gap-2 overflow-x-auto pb-[6px]">
      {statusOrder.map((status) => (
        <KanbanColumn
          key={status}
          {...getColumnProps(status)}
          extra={
            <div
              ref={(el) => columnRef(status, el as HTMLElement | null)}
              style={{ position: "absolute" }}
            />
          }
        />
      ))}
    </section>
  );
}
