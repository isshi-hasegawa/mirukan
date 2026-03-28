import { SparklesIcon } from "@heroicons/react/24/solid";
import type { Session } from "@supabase/supabase-js";
import { UserMenu } from "./UserMenu.tsx";

type Props = {
  session: Session;
  isMobileLayout: boolean;
  onOpenRecommend: () => void;
  onOpenAddModal: () => void;
};

export function Header({ session, isMobileLayout, onOpenRecommend, onOpenAddModal }: Props) {
  return (
    <header className="board-header">
      <div className="header-actions">
        <button className="ghost-button" type="button" onClick={onOpenRecommend}>
          <SparklesIcon className="recommend-icon" />
          見る作品を決める
        </button>
        {!isMobileLayout && (
          <button className="primary-button" type="button" onClick={onOpenAddModal}>
            <svg className="search-icon" viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="4.75" />
              <path d="M12.2 12.2 16 16" />
            </svg>
            作品を探す
          </button>
        )}
      </div>

      <div className="header-user">
        <UserMenu email={session.user.email} />
      </div>
    </header>
  );
}
