import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "./lib/auth-repository.ts";
import { LoginPage } from "./features/backlog/components/LoginPage.tsx";
import { BoardPage } from "./features/backlog/components/BoardPage.tsx";
import { ResetPasswordPage } from "./features/backlog/components/ResetPasswordPage.tsx";
import { PrivacyPolicyPage } from "./features/backlog/components/PrivacyPolicyPage.tsx";
import { TermsOfServicePage } from "./features/backlog/components/TermsOfServicePage.tsx";

function isPasswordRecoveryLocation(location: Pick<Location, "hash" | "search">) {
  const searchParams = new URLSearchParams(location.search);

  if (searchParams.get("type") === "recovery") {
    return true;
  }

  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
  return hashParams.get("type") === "recovery";
}

function clearPasswordRecoveryLocation() {
  const authParamNames = [
    "access_token",
    "refresh_token",
    "expires_in",
    "expires_at",
    "token_type",
    "type",
    "code",
  ];
  const url = new URL(window.location.href);
  let hasChanged = false;

  for (const name of authParamNames) {
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name);
      hasChanged = true;
    }
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  for (const name of authParamNames) {
    if (hashParams.has(name)) {
      hashParams.delete(name);
      hasChanged = true;
    }
  }

  if (hasChanged) {
    url.hash = hashParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
}

function AuthenticatedApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() =>
    isPasswordRecoveryLocation(window.location),
  );

  useEffect(() => {
    void getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch((error: unknown) => {
        console.error("セッション取得に失敗しました", error);
        setSession(null);
      });

    const {
      data: { subscription },
    } = onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      } else if (event === "USER_UPDATED") {
        setIsPasswordRecovery(false);
        clearPasswordRecoveryLocation();
      } else if (event === "SIGNED_IN") {
        setIsPasswordRecovery(isPasswordRecoveryLocation(window.location));
      } else if (event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
        clearPasswordRecoveryLocation();
      }

      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <LoginPage isSessionLoading />;
  }

  if (isPasswordRecovery && session) {
    return <ResetPasswordPage />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return <BoardPage session={session} />;
}

export function App() {
  const pathname = window.location.pathname;
  if (pathname === "/privacy") return <PrivacyPolicyPage />;
  if (pathname === "/terms") return <TermsOfServicePage />;
  return <AuthenticatedApp />;
}
