import type { Session } from "@supabase/supabase-js";
import { BrandWordmark } from "./BrandWordmark.tsx";
import { UserMenu } from "./UserMenu.tsx";

type Props = {
  session: Session;
};

export function Header({ session }: Props) {
  return (
    <header className="w-full min-w-0 overflow-hidden border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4 max-[720px]:gap-3 max-[500px]:px-3 max-[500px]:py-3 max-[500px]:gap-2 max-[500px]:rounded-[18px] max-[400px]:px-2 max-[400px]:py-2 max-[400px]:gap-1.5 max-[400px]:rounded-[16px]">
      <div className="min-w-0">
        <BrandWordmark
          className="max-w-[180px]"
          titleClassName="block whitespace-nowrap text-[clamp(1.6rem,3vw,2.25rem)] leading-[0.9] tracking-[-0.06em] text-white"
          subtitleClassName="mt-0.5 block whitespace-nowrap text-[0.6rem] font-medium tracking-[0.2em] text-white/38 uppercase max-[400px]:hidden"
          symbolClassName="h-10 w-10 shrink-0 object-contain"
        />
      </div>

      <div className="flex items-center shrink-0">
        <UserMenu email={session.user.email} />
      </div>
    </header>
  );
}
