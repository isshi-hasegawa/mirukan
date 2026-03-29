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
      className="flex flex-col rounded-[24px] p-[14px] h-full min-h-0 border border-[var(--border)] bg-[var(--surface)] backdrop-blur-[20px] shadow-[var(--shadow)]"
      data-column-status={status}
    >
      {extra}
      <header className="flex justify-between gap-[10px] items-center pb-[10px] border-b border-[rgba(92,59,35,0.08)]">
        <div className="flex items-center gap-2">
          <h2>{statusLabels[status]}</h2>
          <span className="inline-flex items-center justify-center min-w-[34px] px-[10px] py-[6px] rounded-full text-[0.82rem] font-bold bg-primary/15 text-primary">
            {items.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-full border border-primary/[0.18] bg-primary/[0.08] text-primary hover:bg-primary/[0.15] hover:text-primary"
          type="button"
          aria-label={`${statusLabels[status]} に追加`}
          title={`${statusLabels[status]} に追加`}
          onClick={() => onOpenAddModal(status)}
        >
          <svg
            className="w-[18px] h-[18px] stroke-current fill-none [stroke-linecap:round] [stroke-width:1.75]"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M10 4.25v11.5M4.25 10h11.5" />
          </svg>
        </Button>
      </header>
      <div
        ref={setNodeRef}
        className="grid flex-1 content-start gap-[10px] mt-[10px] overflow-y-auto min-h-0"
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
