import { useEffect, useRef } from "react";
import {
  BoltIcon,
  ClockIcon,
  FilmIcon,
  FireIcon,
  SpeakerWaveIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { getViewingMode, type ViewingMode } from "../data.ts";
import { getDropSide } from "../helpers.ts";
import { PlatformIcon } from "./PlatformIcon.tsx";
import { PosterImage } from "./PosterImage.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

const modeLabel: Record<ViewingMode, string> = {
  focus: "ガッツリ",
  thoughtful: "じっくり",
  quick: "サクッと",
  background: "ながら見",
};

const ModeIcon: Record<
  ViewingMode,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  focus: FireIcon,
  thoughtful: ClockIcon,
  quick: BoltIcon,
  background: SpeakerWaveIcon,
};

const TOUCH_HOLD_MS = 300;
const TOUCH_MOVE_THRESHOLD_PX = 8;

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
  item: BacklogItem;
  showModeBadge?: boolean;
  dropIndicator: DropIndicator | null;
  onOpenDetail: () => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
  onDragStart: (itemId: string, status: BacklogStatus) => void;
  onDragEnd: () => void;
  onDragOver: (itemId: string, clientY: number) => void;
  onDrop: (
    targetStatus: BacklogStatus,
    targetItemId: string | null,
    side: "before" | "after",
  ) => void;
};

export function BacklogCard({
  item,
  showModeBadge = false,
  dropIndicator,
  onOpenDetail,
  onDeleteItem,
  onMarkAsWatched,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const articleRef = useRef<HTMLElement>(null);
  const callbackRef = useRef({ onDragStart, onDragEnd, onDragOver, onDrop });
  const touchState = useRef<{
    startX: number;
    startY: number;
    isDragging: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ startX: 0, startY: 0, isDragging: false, timer: null });

  useEffect(() => {
    callbackRef.current = { onDragStart, onDragEnd, onDragOver, onDrop };
  });

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchState.current.startX = touch.clientX;
      touchState.current.startY = touch.clientY;
      touchState.current.isDragging = false;
      touchState.current.timer = setTimeout(() => {
        touchState.current.isDragging = true;
        callbackRef.current.onDragStart(item.id, item.status);
      }, TOUCH_HOLD_MS);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchState.current.startX;
      const dy = touch.clientY - touchState.current.startY;

      if (!touchState.current.isDragging) {
        if (Math.abs(dx) > TOUCH_MOVE_THRESHOLD_PX || Math.abs(dy) > TOUCH_MOVE_THRESHOLD_PX) {
          if (touchState.current.timer) {
            clearTimeout(touchState.current.timer);
            touchState.current.timer = null;
          }
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const underEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardEl = underEl?.closest("[data-card-id]") as HTMLElement | null;
      if (cardEl && cardEl !== el) {
        callbackRef.current.onDragOver(cardEl.dataset.cardId!, touch.clientY);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchState.current.timer) {
        clearTimeout(touchState.current.timer);
        touchState.current.timer = null;
      }
      if (!touchState.current.isDragging) return;
      touchState.current.isDragging = false;
      e.stopPropagation();

      const touch = e.changedTouches[0];
      const underEl = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardEl = underEl?.closest("[data-card-id]") as HTMLElement | null;
      const colEl = underEl?.closest("[data-column-status]") as HTMLElement | null;

      if (cardEl && cardEl !== el) {
        const side = getDropSide(cardEl, touch.clientY);
        callbackRef.current.onDrop(
          cardEl.dataset.cardStatus as BacklogStatus,
          cardEl.dataset.cardId!,
          side,
        );
      } else if (colEl) {
        callbackRef.current.onDrop(colEl.dataset.columnStatus as BacklogStatus, null, "after");
      }

      callbackRef.current.onDragEnd();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [item.id, item.status]);

  const work = item.works;

  if (!work) {
    return null;
  }

  const title = work.title;
  const viewingMode = showModeBadge ? getViewingMode(work) : null;
  const WorkTypeIcon = work.work_type === "movie" ? FilmIcon : TvIcon;
  const workTypeLabel =
    work.work_type === "movie" ? "映画" : work.work_type === "series" ? "シリーズ" : "シーズン";
  const metadataRest = [work.release_date ? work.release_date.slice(0, 4) : null].filter(Boolean);

  const cardDropIndicator =
    dropIndicator?.type === "card" && dropIndicator.itemId === item.id ? dropIndicator : null;

  const dropStyle: React.CSSProperties | undefined =
    cardDropIndicator?.side === "before"
      ? {
          borderTop: "3px solid var(--primary)",
          boxShadow: "inset 0 8px 0 -5px rgba(191,90,54,0.18)",
        }
      : cardDropIndicator?.side === "after"
        ? {
            borderBottom: "3px solid var(--primary)",
            boxShadow: "inset 0 -8px 0 -5px rgba(191,90,54,0.18)",
          }
        : undefined;

  return (
    <article
      ref={articleRef}
      className="grid gap-[10px] pt-[18px] pr-11 pb-4 pl-4 rounded-[18px] bg-[var(--surface-strong)] border border-[rgba(92,59,35,0.08)] transition-[opacity,box-shadow,border-color] duration-[140ms] ease-[ease] relative cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-primary/45 focus-visible:border-primary/[0.18] focus-visible:shadow-[0_14px_32px_rgba(75,48,30,0.08)] hover:border-primary/[0.18] hover:shadow-[0_14px_32px_rgba(75,48,30,0.08)]"
      style={dropStyle}
      draggable
      data-card-id={item.id}
      data-card-status={item.status}
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      onDragStart={(e) => {
        onDragStart(item.id, item.status);
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(item.id, e.clientY);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const side = getDropSide(e.currentTarget, e.clientY);
        onDrop(item.status, item.id, side);
      }}
    >
      <div className="absolute top-[10px] right-[10px]">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-transparent text-[var(--text-muted)] cursor-pointer hover:bg-[rgba(92,59,35,0.08)] focus:outline-2 focus:outline-primary/45 focus:outline-offset-[2px]"
            aria-label="カードメニューを開く"
            title="カードメニューを開く"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="4.25" r="1.4" />
              <circle cx="10" cy="10" r="1.4" />
              <circle cx="10" cy="15.75" r="1.4" />
            </svg>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={6}
            className="min-w-[132px] w-auto rounded-[14px] p-[6px] bg-[rgba(255,253,248,0.98)] border border-[rgba(92,59,35,0.12)] shadow-[0_16px_40px_rgba(75,48,30,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              className="rounded-[10px] px-3 py-[10px] text-[var(--text)] cursor-pointer"
              onSelect={() => onMarkAsWatched(item.id)}
            >
              視聴済み
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="rounded-[10px] px-3 py-[10px] cursor-pointer"
              onSelect={() => onDeleteItem(item.id)}
            >
              削除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {item.primary_platform && (
        <div className="absolute top-[10px] left-[10px] z-[2]">
          <PlatformIcon platform={item.primary_platform} />
        </div>
      )}
      {viewingMode &&
        (() => {
          const Icon = ModeIcon[viewingMode];
          return (
            <div className="absolute bottom-[10px] right-[10px] flex items-center gap-[3px] bg-primary/15 border border-primary/25 rounded-[6px] px-[7px] py-[3px] text-primary text-[0.68rem] font-bold leading-none pointer-events-none">
              <Icon className="w-[11px] h-[11px] shrink-0" aria-hidden />
              <span>{modeLabel[viewingMode]}</span>
            </div>
          );
        })()}
      <div
        className={`grid grid-cols-[64px_minmax(0,1fr)] gap-3 items-start${viewingMode ? " pb-6" : ""}`}
      >
        <div className="relative aspect-[2/3]">
          <div className="overflow-hidden rounded-[14px] w-full h-full border border-[rgba(92,59,35,0.08)] [background:radial-gradient(circle_at_top_left,rgba(255,208,143,0.42),transparent_36%),linear-gradient(180deg,rgba(191,90,54,0.14),rgba(92,59,35,0.08))]">
            <PosterImage
              posterPath={work.poster_path}
              alt={`${title} のポスター`}
              fallbackClassName="w-full h-full grid place-items-center p-2 text-muted-foreground text-[0.68rem] text-center leading-[1.3]"
            />
          </div>
        </div>
        <div className="grid gap-2 min-w-0">
          <p className="text-[1rem] font-bold">{title}</p>
          <p className="text-muted-foreground text-[0.9rem]">
            <WorkTypeIcon
              className="w-[14px] h-[14px] inline-block align-[-2px] mr-[3px] shrink-0"
              aria-hidden="true"
            />
            {workTypeLabel}
            {metadataRest.length > 0 && ` · ${metadataRest.join(" · ")}`}
          </p>
          {item.note && <p className="text-muted-foreground text-[0.9rem]">{item.note}</p>}
        </div>
      </div>
    </article>
  );
}
