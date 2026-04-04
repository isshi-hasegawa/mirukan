import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase.ts";
import { LoginPage } from "./features/backlog/components/LoginPage.tsx";
import { BoardPage } from "./features/backlog/components/BoardPage.tsx";
import { ResetPasswordPage } from "./features/backlog/components/ResetPasswordPage.tsx";

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "USER_UPDATED" || event === "SIGNED_IN") {
        setIsPasswordRecovery(false);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <LoginPage isSessionLoading />;
  }

  if (isPasswordRecovery) {
    return <ResetPasswordPage />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return <BoardPage session={session} />;
}
