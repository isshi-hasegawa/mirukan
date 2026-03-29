import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { supabase } from "../../../lib/supabase.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

type Props = {
  email: string | null | undefined;
};

export function UserMenu({ email }: Props) {
  const displayEmail = email ?? "signed-in user";
  // 小画面用：最初の2文字のみ表示
  const shortEmail = displayEmail.slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary/[0.08] text-foreground border-none cursor-pointer hover:bg-[#2a2a2a] transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 max-[500px]:px-2.5 max-[500px]:py-2 max-[500px]:gap-1.5 max-[400px]:px-2 max-[400px]:py-1.5 max-[400px]:gap-1">
        <span className="text-sm whitespace-nowrap max-[500px]:hidden">{displayEmail}</span>
        <span className="text-sm whitespace-nowrap hidden max-[500px]:inline max-[400px]:text-xs">
          {shortEmail}
        </span>
        <ChevronDownIcon className="w-4 h-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180 max-[400px]:w-3.5 max-[400px]:h-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            void supabase.auth.signOut();
          }}
        >
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
