import { BoltIcon, ClockIcon, FireIcon, SpeakerWaveIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { viewingModeDescriptions, viewingModeLabels, viewingModeOrder } from "../constants.ts";
import type { ViewingMode } from "../types.ts";

const viewingModeIcons: Record<
  ViewingMode,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  focus: FireIcon,
  thoughtful: ClockIcon,
  quick: BoltIcon,
  background: SpeakerWaveIcon,
};

type Props = {
  activeViewingMode: ViewingMode | null;
  onViewingModeToggle: (mode: ViewingMode) => void;
};

export function ViewingModeFilter({ activeViewingMode, onViewingModeToggle }: Props) {
  return (
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
            onClick={() => onViewingModeToggle(mode)}
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
  );
}
