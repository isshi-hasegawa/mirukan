import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { supabase } from "./lib/supabase.ts";
import { LoginPage } from "./features/backlog/components/LoginPage.tsx";
import { BoardPage } from "./features/backlog/components/BoardPage.tsx";

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <>
        <LoginPage isSessionLoading />
        <SpeedInsights />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <LoginPage />
        <SpeedInsights />
      </>
    );
  }

  return (
    <>
      <BoardPage session={session} />
      <SpeedInsights />
    </>
  );
}
