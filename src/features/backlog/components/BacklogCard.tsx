import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BoltIcon,
  ClockIcon,
  FilmIcon,
  FireIcon,
  SpeakerWaveIcon,
  TvIcon,
} from "@heroicons/react/24/outline";
import type { BacklogItem, ViewingMode } from "../types.ts";
import { getViewingMode } from "../viewing-mode.ts";
import { PlatformIcon } from "./PlatformIcon.tsx";
import { PosterImage } from "./PosterImage.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { getWorkMetadataLabels, getWorkTypeLabel } from "../helpers.ts";
import { viewingModeLabels } from "../constants.ts";

const ModeIcon: Record<
  ViewingMode,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  focus: FireIcon,
  thoughtful: ClockIcon,
  quick: BoltIcon,
  background: SpeakerWaveIcon,
};

type Props = {
  item: BacklogItem;
  showModeBadge?: boolean;
  onOpenDetail: () => void;
  onDeleteItem: (itemId: string) => void;
  onMarkAsWatched: (itemId: string) => void;
};

export function BacklogCard({
  item,
  showModeBadge = false,
  onOpenDetail,
  onDeleteItem,
  onMarkAsWatched,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const work = item.works;

  if (!work) {
    return null;
  }

  const title = work.title;
  const viewingMode = showModeBadge ? getViewingMode(work) : null;
  const WorkTypeIcon = work.work_type === "movie" ? FilmIcon : TvIcon;
  const workTypeLabel = getWorkTypeLabel(work.work_type);
  const metadataLabels = getWorkMetadataLabels(work, { includeReleaseYear: true });

  return (
    <article
      ref={setNodeRef}
      className="relative grid w-full min-w-0 cursor-grab gap-[10px] rounded-[18px] border border-[rgba(92,59,35,0.08)] bg-[var(--surface-strong)] pt-[18px] pr-11 pb-4 pl-4 transition-[box-shadow,border-color] duration-[140ms] ease-[ease] active:cursor-grabbing hover:border-primary/[0.18] hover:shadow-[0_14px_32px_rgba(75,48,30,0.08)] focus-visible:outline-2 focus-visible:outline-primary/45 focus-visible:border-primary/[0.18] focus-visible:shadow-[0_14px_32px_rgba(75,48,30,0.08)]"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      data-card-id={item.id}
      data-card-status={item.status}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      {...listeners}
      {...attributes}
    >
      <div className="absolute top-[10px] right-[10px]">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-transparent text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
            aria-label="カードメニューを開く"
            title="カードメニューを開く"
            onPointerDown={(e) => e.stopPropagation()}
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
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsWatched(item.id);
              }}
            >
              視聴済み
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteItem(item.id);
              }}
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
              <span>{viewingModeLabels[viewingMode]}</span>
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
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-[0.9rem]">
            <span className="inline-flex items-center">
              <WorkTypeIcon
                className="w-[14px] h-[14px] inline-block align-[-2px] mr-[3px] shrink-0"
                aria-hidden="true"
              />
              {workTypeLabel}
            </span>
            {metadataLabels.map((label) => (
              <span key={label} className="text-[0.82rem] leading-none text-muted-foreground/80">
                {label}
              </span>
            ))}
          </div>
          {item.note && <p className="text-muted-foreground text-[0.9rem]">{item.note}</p>}
        </div>
      </div>
    </article>
  );
}
