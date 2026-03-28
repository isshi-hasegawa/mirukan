import { useEffect, useRef, useState } from "react";
import type { BacklogItem, BacklogStatus } from "../types.ts";
import { getDropSide } from "../helpers.ts";
import { PlatformIcon } from "./PlatformIcon.tsx";

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = {
  item: BacklogItem;
  dropIndicator: DropIndicator | null;
  openMenuId: string | null;
  onOpenDetail: () => void;
  onToggleMenu: (itemId: string) => void;
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
  dropIndicator,
  openMenuId,
  onOpenDetail,
  onToggleMenu,
  onDeleteItem,
  onMarkAsWatched,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const [posterError, setPosterError] = useState(false);
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
      }, 300);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchState.current.startX;
      const dy = touch.clientY - touchState.current.startY;

      if (!touchState.current.isDragging) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
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

  const posterUrl = work?.poster_path ? `https://image.tmdb.org/t/p/w185${work.poster_path}` : null;

  useEffect(() => {
    setPosterError(false);
  }, [posterUrl]);

  if (!work) {
    return null;
  }

  const title = work.title;
  const metadata = [
    work.work_type === "movie" ? "映画" : work.work_type === "series" ? "シリーズ" : "シーズン",
    work.release_date ? work.release_date.slice(0, 4) : null,
  ].filter(Boolean);

  const isMenuOpen = openMenuId === item.id;
  const cardDropIndicator =
    dropIndicator?.type === "card" && dropIndicator.itemId === item.id ? dropIndicator : null;

  const cardClassName = [
    "card",
    cardDropIndicator?.side === "before" ? "drop-before" : "",
    cardDropIndicator?.side === "after" ? "drop-after" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest("[data-card-menu-toggle]") ||
      (e.target as HTMLElement).closest("[data-card-menu]")
    ) {
      return;
    }
    onOpenDetail();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenDetail();
    }
  };

  return (
    <article
      ref={articleRef}
      className={cardClassName}
      draggable
      data-card-id={item.id}
      data-card-status={item.status}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
      <div className="card-topline">
        <div className="card-menu-wrap">
          <button
            className="card-menu-button"
            type="button"
            data-card-menu-toggle={item.id}
            aria-label="カードメニューを開く"
            title="カードメニューを開く"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(item.id);
            }}
          >
            <svg className="dots-icon" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="4.25" r="1.4" />
              <circle cx="10" cy="10" r="1.4" />
              <circle cx="10" cy="15.75" r="1.4" />
            </svg>
          </button>
          {isMenuOpen && (
            <div className="card-menu" data-card-menu={item.id}>
              <button
                className="card-menu-item"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsWatched(item.id);
                }}
              >
                視聴済み
              </button>
              <button
                className="card-menu-item danger"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
              >
                削除
              </button>
            </div>
          )}
        </div>
      </div>
      {item.primary_platform && (
        <div className="card-platform-badge">
          <PlatformIcon platform={item.primary_platform} />
        </div>
      )}
      <div className="card-body">
        <div className="card-thumb-wrap">
          <div className="card-thumb">
            {posterUrl && !posterError ? (
              <img
                src={posterUrl}
                alt={`${title} のポスター`}
                onError={() => setPosterError(true)}
              />
            ) : (
              <div className="card-thumb-fallback">No Poster</div>
            )}
          </div>
        </div>
        <div className="card-content">
          <p className="card-title">{title}</p>
          <p className="card-meta">{metadata.join(" · ")}</p>
          {item.note && <p className="card-note">{item.note}</p>}
        </div>
      </div>
    </article>
  );
}
