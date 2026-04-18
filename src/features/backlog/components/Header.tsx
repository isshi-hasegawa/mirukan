import type { Session } from "@supabase/supabase-js";
import { Link } from "@tanstack/react-router";
import { boardModeLabels } from "../constants.ts";
import type { BoardMode } from "../types.ts";
import { BrandWordmark } from "./BrandWordmark.tsx";
import { UserMenu } from "./UserMenu.tsx";

type Props = Readonly<{
  session: Session;
  boardMode?: BoardMode;
}>;

export function Header({ session, boardMode = "video" }: Props) {
  return (
    <header className="w-full min-w-0 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[6px] py-[6px] max-[720px]:gap-3 max-[500px]:px-1 max-[500px]:py-1 max-[500px]:gap-2 max-[400px]:gap-1.5">
      <div className="min-w-0 grid gap-3">
        <BrandWordmark
          className="max-w-[180px]"
          titleClassName="block whitespace-nowrap text-[clamp(1.6rem,3vw,2.25rem)] leading-[0.9] tracking-[-0.06em] text-white"
          subtitleClassName="mt-0.5 block whitespace-nowrap text-[0.6rem] font-medium tracking-[0.2em] text-white/38 uppercase max-[400px]:hidden"
          symbolClassName="h-10 w-10 shrink-0 object-contain"
        />
        <nav
          className="inline-flex w-fit items-center gap-1 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-1"
          aria-label="ボード切り替え"
        >
          {(["video", "game"] as const).map((mode) => {
            const isActive = boardMode === mode;

            return (
              <Link
                key={mode}
                to={`/${mode}`}
                className={[
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-white/70 hover:text-white hover:bg-white/8",
                ].join(" ")}
              >
                {boardModeLabels[mode]}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center shrink-0">
        <UserMenu email={session.user.email} />
      </div>
    </header>
  );
}
