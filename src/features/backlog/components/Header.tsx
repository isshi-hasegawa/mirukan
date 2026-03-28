import { SparklesIcon } from "@heroicons/react/24/solid";
import type { Session } from "@supabase/supabase-js";
import { UserMenu } from "./UserMenu.tsx";

type Props = {
  session: Session;
  onOpenRecommend: () => void;
};

export function Header({ session, onOpenRecommend }: Props) {
  return (
    <header className="board-header">
      <div className="header-actions">
        <button className="ghost-button" type="button" onClick={onOpenRecommend}>
          <SparklesIcon className="recommend-icon" />
          おすすめを探す
        </button>
      </div>

      <div className="header-user">
        <UserMenu email={session.user.email} />
      </div>
    </header>
  );
}
