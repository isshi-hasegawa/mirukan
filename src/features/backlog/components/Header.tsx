import type { Session } from "@supabase/supabase-js";
import { BrandWordmark } from "./BrandWordmark.tsx";
import { UserMenu } from "./UserMenu.tsx";

type Props = Readonly<{
  session: Session;
}>;

export function Header({ session }: Props) {
  return (
    <header className="w-full min-w-0 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[6px] py-[6px] max-[720px]:gap-3 max-[500px]:px-1 max-[500px]:py-1 max-[500px]:gap-2 max-[400px]:gap-1.5">
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
