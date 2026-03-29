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
    <header className="border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[1fr_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4 max-[720px]:gap-3 max-[500px]:px-3 max-[500px]:py-3 max-[500px]:gap-2 max-[500px]:rounded-[18px] max-[400px]:px-2 max-[400px]:py-2 max-[400px]:gap-1.5 max-[400px]:rounded-[16px]">
      <div className="flex gap-2.5 items-center flex-wrap max-[720px]:gap-2 max-[500px]:gap-1.5 max-[400px]:gap-1 min-w-0">
        <Button
          variant="outline"
          className="rounded-full gap-2 max-[720px]:px-3 max-[720px]:py-2 max-[720px]:text-[0.9rem] max-[500px]:px-2.5 max-[500px]:py-1.5 max-[500px]:text-[0.85rem] max-[500px]:gap-1.5 max-[400px]:px-2 max-[400px]:py-1 max-[400px]:text-[0.8rem] max-[400px]:gap-1"
          type="button"
          onClick={onOpenRecommend}
        >
          <SparklesIcon className="w-4 h-4 max-[500px]:w-3.5 max-[500px]:h-3.5 max-[400px]:w-3 max-[400px]:h-3" />
          <span className="max-[400px]:hidden">おすすめを探す</span>
          <span className="hidden max-[400px]:inline">おすすめ</span>
        </Button>
      </div>

      <div className="flex items-center shrink-0">
        <UserMenu email={session.user.email} />
      </div>
    </header>
  );
}
