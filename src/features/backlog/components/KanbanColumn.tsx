import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { statusLabels } from "../constants.ts";
import { BacklogCard } from "./BacklogCard.tsx";
import { Button } from "@/components/ui/button.tsx";

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
  status: BacklogStatus;
  items: BacklogItem[];
  extra?: ReactNode;
  featuredIds?: Set<string>;
  dropIndicator: DropIndicator | null;
  onOpenAddModal: (status: BacklogStatus) => void;
  onOpenDetail: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
};

export function KanbanColumn({
  status,
  items,
  extra,
  featuredIds,
  dropIndicator,
  onOpenAddModal,
  onOpenDetail,
  onDeleteItem,
  onMarkAsWatched,
}: Props) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });
  const isColumnActive = dropIndicator?.type === "column" && dropIndicator.status === status;

  const dropzoneStyle: React.CSSProperties | undefined = isColumnActive
    ? {
        minHeight: "120px",
        borderRadius: "20px",
        outline: "2px dashed rgba(191, 90, 54, 0.45)",
        outlineOffset: "6px",
      }
    : undefined;

  return (
    <section
      className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-[24px] border border-[var(--border)] bg-[var(--surface)] pl-[14px] pr-0 py-[14px] shadow-[var(--shadow)] backdrop-blur-[20px] max-[500px]:rounded-[18px] max-[500px]:pl-3 max-[500px]:pr-0 max-[500px]:py-3 max-[400px]:rounded-[14px] max-[400px]:pl-2 max-[400px]:pr-0 max-[400px]:py-2"
      data-column-status={status}
    >
      {extra}
      <header className="flex items-center justify-between gap-[10px] border-b border-[rgba(92,59,35,0.08)] pb-[10px] min-w-0 pr-[14px] max-[500px]:gap-2 max-[500px]:pr-3 max-[400px]:gap-1.5 max-[400px]:pb-2 max-[400px]:pr-2">
        <div className="flex items-center gap-2 max-[500px]:gap-1.5 max-[400px]:gap-1 min-w-0 flex-1">
          <h2 className="max-[500px]:text-[0.95rem] max-[400px]:text-[0.875rem] truncate">
            {statusLabels[status]}
          </h2>
          <span className="inline-flex items-center justify-center min-w-[34px] px-[10px] py-[6px] rounded-full text-[0.82rem] font-bold bg-primary/15 text-primary max-[500px]:min-w-[28px] max-[500px]:px-2 max-[500px]:py-1 max-[500px]:text-[0.75rem] max-[400px]:min-w-[24px] max-[400px]:px-1.5 max-[400px]:py-0.5 max-[400px]:text-[0.7rem] shrink-0">
            {items.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full border border-primary/[0.18] bg-primary/[0.08] text-primary hover:bg-primary/[0.15] hover:text-primary max-[500px]:w-8 max-[500px]:h-8 max-[400px]:w-7 max-[400px]:h-7 shrink-0"
          type="button"
          aria-label={`${statusLabels[status]} に追加`}
          title={`${statusLabels[status]} に追加`}
          onClick={() => onOpenAddModal(status)}
        >
          <svg
            className="w-[18px] h-[18px] stroke-current fill-none [stroke-linecap:round] [stroke-width:1.75] max-[500px]:w-4 max-[500px]:h-4 max-[400px]:w-3.5 max-[400px]:h-3.5"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M10 4.25v11.5M4.25 10h11.5" />
          </svg>
        </Button>
      </header>
      <div
        ref={setNodeRef}
        className="mt-[10px] grid min-h-0 min-w-0 flex-1 content-start gap-[10px] overflow-y-auto pr-[14px] [scrollbar-gutter:stable] max-[500px]:pr-3 max-[400px]:pr-2"
        style={dropzoneStyle}
      >
        {items.length > 0 ? (
          items.map((item) => (
            <BacklogCard
              key={item.id}
              item={item}
              showModeBadge={featuredIds?.has(item.id) ?? false}
              dropIndicator={dropIndicator}
              onOpenDetail={() => onOpenDetail(item.id)}
              onDeleteItem={onDeleteItem}
              onMarkAsWatched={onMarkAsWatched}
            />
          ))
        ) : (
          <p className="text-[var(--text-muted)] pt-[18px] text-[0.92rem]">
            この列にはまだカードがありません。
          </p>
        )}
      </div>
    </section>
  );
}
