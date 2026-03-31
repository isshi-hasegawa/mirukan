import type { Session } from "@supabase/supabase-js";
import { UserMenu } from "./UserMenu.tsx";

type Props = {
  session: Session;
};

export function Header({ session }: Props) {
  return (
    <header className="w-full min-w-0 overflow-hidden border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4 max-[720px]:gap-3 max-[500px]:px-3 max-[500px]:py-3 max-[500px]:gap-2 max-[500px]:rounded-[18px] max-[400px]:px-2 max-[400px]:py-2 max-[400px]:gap-1.5 max-[400px]:rounded-[16px]">
      <div className="min-w-0">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-muted-foreground">
          Watch Backlog
        </p>
        <h1 className="truncate text-[1.15rem] font-semibold text-foreground">mirukan</h1>
      </div>

      <div className="flex items-center shrink-0">
        <UserMenu email={session.user.email} />
      </div>
    </header>
  );
}
