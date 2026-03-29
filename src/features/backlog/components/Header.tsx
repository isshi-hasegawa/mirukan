import { SparklesIcon } from "@heroicons/react/24/solid";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button.tsx";
import { UserMenu } from "./UserMenu.tsx";

type Props = {
  session: Session;
  onOpenRecommend: () => void;
};

export function Header({ session, onOpenRecommend }: Props) {
  return (
    <header className="border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[1fr_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4 max-[720px]:gap-3">
      <div className="flex gap-2.5 items-center flex-wrap max-[720px]:gap-2">
        <Button
          variant="outline"
          className="rounded-full gap-2 max-[720px]:px-3 max-[720px]:py-2 max-[720px]:text-[0.9rem]"
          type="button"
          onClick={onOpenRecommend}
        >
          <SparklesIcon className="w-4 h-4" />
          おすすめを探す
        </Button>
      </div>

      <div className="flex items-center">
        <UserMenu email={session.user.email} />
      </div>
    </header>
  );
}
