import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { LazyViewBoundary } from "./components/LazyViewBoundary.tsx";
import { getSession, onAuthStateChange } from "./lib/auth-repository.ts";
import { lazyNamed } from "./lib/lazy-component.ts";
import { LoginPage } from "./features/backlog/components/LoginPage.tsx";
import { PrivacyPolicyPage } from "./features/backlog/components/PrivacyPolicyPage.tsx";
import { TermsOfServicePage } from "./features/backlog/components/TermsOfServicePage.tsx";

const BoardPage = lazyNamed(
  () => import("./features/backlog/components/BoardPage.tsx"),
  "BoardPage",
);
const ResetPasswordPage = lazyNamed(
  () => import("./features/backlog/components/ResetPasswordPage.tsx"),
  "ResetPasswordPage",
);

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
  const url = new URL(globalThis.location.href);
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
    globalThis.history.replaceState(
      globalThis.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
}

function LazyRouteErrorFallback() {
  return (
    <main className="min-h-svh px-4 py-10 grid place-items-center bg-background">
      <section className="w-full max-w-[520px] rounded-[28px] border border-border bg-card px-6 py-7 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
        <div className="grid gap-3">
          <h1 className="text-[1.5rem] leading-tight text-foreground">
            画面の読み込みに失敗しました。
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            デプロイ直後の更新や通信エラーで必要なコードを取得できませんでした。再読み込みしてもう一度お試しください。
          </p>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => globalThis.location.reload()}
          >
            再読み込み
          </Button>
        </div>
      </section>
    </main>
  );
}

function AuthenticatedApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() =>
    isPasswordRecoveryLocation(globalThis.location),
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
        setIsPasswordRecovery(isPasswordRecoveryLocation(globalThis.location));
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
    return (
      <LazyViewBoundary
        loadingFallback={<LoginPage isSessionLoading />}
        errorFallback={<LazyRouteErrorFallback />}
        resetKey="password-recovery"
      >
        <ResetPasswordPage />
      </LazyViewBoundary>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <LazyViewBoundary
      loadingFallback={<LoginPage isSessionLoading />}
      errorFallback={<LazyRouteErrorFallback />}
      resetKey="board"
    >
      <BoardPage session={session} />
    </LazyViewBoundary>
  );
}

const rootRoute = createRootRoute({ component: Outlet });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AuthenticatedApp,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: PrivacyPolicyPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsOfServicePage,
});

export const routeTree = rootRoute.addChildren([indexRoute, privacyRoute, termsRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return <RouterProvider router={router} />;
}
