import { Button } from "@/components/ui/button.tsx";
import { statusLabels } from "../constants.ts";
import type { BacklogStatus } from "../types.ts";

type Props = Readonly<{
  status: BacklogStatus;
  itemCount: number;
  isMobileLayout: boolean;
  onOpenAddModal: () => void;
}>;

export function KanbanColumnHeader({ status, itemCount, isMobileLayout, onOpenAddModal }: Props) {
  return (
    <header className="flex items-center justify-between gap-[10px] border-b border-[rgba(92,59,35,0.08)] px-[14px] pb-[10px] min-w-0 max-[500px]:gap-2 max-[500px]:px-3 max-[400px]:gap-1.5 max-[400px]:px-2 max-[400px]:pb-2">
      <div className="flex items-center gap-2 max-[500px]:gap-1.5 max-[400px]:gap-1 min-w-0 flex-1">
        <h2 className="max-[500px]:text-[0.95rem] max-[400px]:text-[0.875rem] truncate">
          {statusLabels[status]}
        </h2>
        <span className="inline-flex items-center justify-center min-w-[34px] px-[10px] py-[6px] rounded-full border border-[var(--border)] bg-[rgba(92,59,35,0.04)] text-[0.82rem] font-bold text-[var(--text-muted)] max-[500px]:min-w-[28px] max-[500px]:px-2 max-[500px]:py-1 max-[500px]:text-[0.75rem] max-[400px]:min-w-[24px] max-[400px]:px-1.5 max-[400px]:py-0.5 max-[400px]:text-[0.7rem] shrink-0">
          {itemCount}
        </span>
      </div>
      {status === "stacked" ? (
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
      ) : null}
    </header>
  );
}
