import { useEffect, useState } from "react";
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
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const [posterError, setPosterError] = useState(false);

  const work = item.works;

  const posterUrl = work?.poster_path ? `https://image.tmdb.org/t/p/w185${work.poster_path}` : null;

  useEffect(() => {
    setPosterError(false);
  }, [posterUrl]);

  if (!work) {
    return null;
  }

  const title = item.display_title ?? work.title;
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
      <div className="card-body">
        <div className="card-thumb">
          {posterUrl && !posterError ? (
            <img src={posterUrl} alt={`${title} のポスター`} onError={() => setPosterError(true)} />
          ) : (
            <div className="card-thumb-fallback">No Poster</div>
          )}
          {item.primary_platform && (
            <div className="card-platform-badge">
              <PlatformIcon platform={item.primary_platform} />
            </div>
          )}
        </div>
        <div className="card-content">
          <p className="card-title">{title}</p>
          <p className="card-meta">{metadata.join(" · ")}</p>
          <div className="card-footer" />
          {item.note && <p className="card-note">{item.note}</p>}
        </div>
      </div>
    </article>
  );
}
