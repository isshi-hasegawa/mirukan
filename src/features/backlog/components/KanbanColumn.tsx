import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  BoltIcon,
  ClockIcon,
  FireIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import type { BacklogItem, BacklogStatus, ViewingMode } from "../types.ts";
import {
  statusLabels,
  viewingModeDescriptions,
  viewingModeLabels,
  viewingModeOrder,
} from "../constants.ts";
import { BacklogCard } from "./BacklogCard.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils";

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
  status: BacklogStatus;
  items: BacklogItem[];
  extra?: ReactNode;
  activeViewingMode?: ViewingMode | null;
  isMobileLayout?: boolean;
  dropIndicator: DropIndicator | null;
  onOpenAddModal: () => void;
  onOpenDetail: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
  onViewingModeToggle?: (mode: ViewingMode) => void;
};

const viewingModeIcons: Record<
  ViewingMode,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  focus: FireIcon,
  thoughtful: ClockIcon,
  quick: BoltIcon,
  background: SpeakerWaveIcon,
};

export function KanbanColumn({
  status,
  items,
  extra,
  activeViewingMode = null,
  isMobileLayout = false,
  dropIndicator,
  onOpenAddModal,
  onOpenDetail,
  onDeleteItem,
  onMarkAsWatched,
  onViewingModeToggle,
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
      className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-[24px] border border-[var(--border)] bg-[var(--surface)] py-[14px] shadow-[var(--shadow)] backdrop-blur-[20px] max-[500px]:rounded-[18px] max-[500px]:py-3 max-[400px]:rounded-[14px] max-[400px]:py-2"
      data-column-status={status}
    >
      {extra}
      <header className="flex items-center justify-between gap-[10px] border-b border-[rgba(92,59,35,0.08)] px-[14px] pb-[10px] min-w-0 max-[500px]:gap-2 max-[500px]:px-3 max-[400px]:gap-1.5 max-[400px]:px-2 max-[400px]:pb-2">
        <div className="flex items-center gap-2 max-[500px]:gap-1.5 max-[400px]:gap-1 min-w-0 flex-1">
          <h2 className="max-[500px]:text-[0.95rem] max-[400px]:text-[0.875rem] truncate">
            {statusLabels[status]}
          </h2>
          <span className="inline-flex items-center justify-center min-w-[34px] px-[10px] py-[6px] rounded-full border border-[var(--border)] bg-[rgba(92,59,35,0.04)] text-[0.82rem] font-bold text-[var(--text-muted)] max-[500px]:min-w-[28px] max-[500px]:px-2 max-[500px]:py-1 max-[500px]:text-[0.75rem] max-[400px]:min-w-[24px] max-[400px]:px-1.5 max-[400px]:py-0.5 max-[400px]:text-[0.7rem] shrink-0">
            {items.length}
          </span>
        </div>
        {status === "stacked" && (
          <Button
            variant="ghost"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-primary/[0.2] bg-primary/[0.1] px-3 text-[0.82rem] font-semibold text-primary hover:bg-primary/[0.16] hover:text-primary max-[500px]:h-8 max-[500px]:gap-1.5 max-[500px]:px-2.5 max-[500px]:text-[0.74rem] max-[400px]:h-7 max-[400px]:gap-1 max-[400px]:px-2 max-[400px]:text-[0.7rem]"
            type="button"
            aria-label="作品を検索してストックに追加"
            title="作品を検索してストックに追加"
            onClick={onOpenAddModal}
          >
            <svg
              className="h-[16px] w-[16px] stroke-current fill-none [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.8] max-[500px]:h-[14px] max-[500px]:w-[14px] max-[400px]:h-3 max-[400px]:w-3"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <circle cx="8.5" cy="8.5" r="4.75" />
              <path d="M12 12l4.25 4.25" />
            </svg>
            <span>{isMobileLayout ? "検索" : "作品を検索"}</span>
          </Button>
        )}
      </header>
      <div
        ref={setNodeRef}
        className="grid min-h-0 min-w-0 flex-1 content-start gap-[10px] overflow-y-auto pt-[10px] [scrollbar-gutter:stable]"
        style={dropzoneStyle}
      >
        <div className="grid content-start gap-[10px] pl-[14px] pr-[4px] max-[500px]:px-3 max-[400px]:px-2">
          {status === "stacked" && (
            <div
              className="grid grid-cols-2 gap-2 pb-1 max-[380px]:grid-cols-1"
              role="group"
              aria-label="おすすめの絞り込み"
            >
              {viewingModeOrder.map((mode) => {
                const isActive = activeViewingMode === mode;
                const Icon = viewingModeIcons[mode];
                return (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "grid content-start gap-1.5 rounded-[16px] border px-3 py-2 text-left transition-[background,color,border-color] duration-150",
                      "focus-visible:outline-2 focus-visible:outline-primary/50 focus-visible:outline-offset-2",
                      isActive
                        ? "border-primary/70 bg-primary/12 text-foreground"
                        : "border-[rgba(92,59,35,0.18)] bg-[rgba(255,255,255,0.02)] text-muted-foreground hover:border-primary/[0.28] hover:bg-primary/[0.08] hover:text-foreground",
                    )}
                    aria-pressed={isActive}
                    onClick={() => onViewingModeToggle?.(mode)}
                  >
                    <span className="flex items-center gap-1.5 text-[0.8rem] font-semibold">
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded-full",
                          isActive ? "bg-primary text-primary-foreground" : "bg-[rgba(92,59,35,0.08)]",
                        )}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                      </span>
                      <span>{viewingModeLabels[mode]}</span>
                    </span>
                    <span className="text-[0.68rem] leading-[1.4] text-inherit/80">
                      {viewingModeDescriptions[mode]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {items.length > 0 ? (
            items.map((item) => (
              <BacklogCard
                key={item.id}
                item={item}
                showModeBadge={status === "stacked"}
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
      </div>
    </section>
  );
}
