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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary/[0.08] text-foreground border-none cursor-pointer hover:bg-[#2a2a2a] transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
        <span className="text-sm whitespace-nowrap">{email ?? "signed-in user"}</span>
        <ChevronDownIcon className="w-4 h-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
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
