import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { supabase } from "../../../lib/supabase.ts";

type Props = {
  email: string | null | undefined;
};

export function UserMenu({ email }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      <button
        className="user-menu-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="user-email">{email ?? "signed-in user"}</span>
        <ChevronDownIcon className="chevron-icon" />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown" role="menu">
          <button
            className="user-menu-item"
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              void supabase.auth.signOut();
            }}
          >
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
