import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { supabase } from "../../../lib/supabase.ts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { AboutDialog } from "./AboutDialog.tsx";

type Props = {
  email: string | null | undefined;
};

const BUG_REPORT_URL = "https://github.com/isshi-hasegawa/mirukan/issues/new/choose";

export function UserMenu({ email }: Props) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const displayEmail = email ?? "ログイン中のユーザー";
  // 小画面用：最初の2文字のみ表示
  const shortEmail = displayEmail.slice(0, 2);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex max-w-full min-w-0 items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary/[0.08] text-foreground border-none cursor-pointer hover:bg-[#2a2a2a] transition-colors focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 max-[500px]:px-2.5 max-[500px]:py-2 max-[500px]:gap-1.5 max-[400px]:px-2 max-[400px]:py-1.5 max-[400px]:gap-1">
          <span className="max-w-[220px] truncate text-sm max-[720px]:hidden">{displayEmail}</span>
          <span className="hidden text-sm whitespace-nowrap max-[720px]:inline max-[400px]:text-xs">
            {shortEmail}
          </span>
          <ChevronDownIcon className="w-4 h-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180 max-[400px]:w-3.5 max-[400px]:h-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setIsAboutOpen(true);
            }}
          >
            About
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.open("/terms", "_blank", "noopener,noreferrer");
            }}
          >
            利用規約
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.open("/privacy", "_blank", "noopener,noreferrer");
            }}
          >
            プライバシーポリシー
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.open(BUG_REPORT_URL, "_blank", "noopener,noreferrer");
            }}
          >
            不具合を報告
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              void supabase.auth.signOut();
            }}
          >
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isAboutOpen ? <AboutDialog onClose={() => setIsAboutOpen(false)} /> : null}
    </>
  );
}
