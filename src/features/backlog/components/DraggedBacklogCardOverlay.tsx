import type { BacklogItem } from "../types.ts";

type Props = {
  item: BacklogItem | null;
};

export function DraggedBacklogCardOverlay({ item }: Props) {
  if (!item?.works) {
    return null;
  }

  return (
    <div className="opacity-60">
      <div className="grid gap-[10px] pt-[18px] pr-11 pb-4 pl-4 rounded-[18px] bg-[var(--surface-strong)] border border-[rgba(92,59,35,0.08)] cursor-grabbing pointer-events-none">
        <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 items-start">
          <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] border border-[rgba(92,59,35,0.08)]">
            {item.works.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w200${item.works.poster_path}`}
                alt=""
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="grid gap-2 min-w-0">
            <p className="text-[1rem] font-bold">{item.works.title}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
