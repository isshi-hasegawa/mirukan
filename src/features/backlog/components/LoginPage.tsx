import { AuthScreen } from "./AuthScreen.tsx";
import { BrandWordmark } from "./BrandWordmark.tsx";
import { LoginPageAuthForm } from "./LoginPageAuthForm.tsx";
import {
  getAuthRedirectUrl,
  useLoginPageAuth,
  type DevLoginCredentials,
} from "../hooks/useLoginPageAuth.ts";

type Props = {
  devLoginCredentials?: DevLoginCredentials | null;
  isSessionLoading?: boolean;
  showDevLoginHint?: boolean;
};

export { getAuthRedirectUrl };

function getDevLoginCredentials(): DevLoginCredentials | null {
  if (!import.meta.env.DEV || import.meta.env.MODE === "test") {
    return null;
  }

  return {
    // Seeded local-only account for development convenience, not a production secret.
    email: import.meta.env.VITE_DEV_LOGIN_EMAIL || "akari@example.com",
    password: import.meta.env.VITE_DEV_LOGIN_PASSWORD || "password123",
  };
}

export function LoginPage({
  devLoginCredentials = getDevLoginCredentials(),
  isSessionLoading = false,
  showDevLoginHint = import.meta.env.DEV && import.meta.env.MODE !== "test",
}: Props) {
  const auth = useLoginPageAuth({
    devLoginCredentials,
    showDevLoginHint: showDevLoginHint && !isSessionLoading,
  });

  return (
    <AuthScreen
      badge={isSessionLoading ? "AUTH" : undefined}
      title={isSessionLoading ? "みるカン" : undefined}
      description={
        isSessionLoading
          ? "保存済みのログイン状態を確認しています。画面の準備ができるまで、このままお待ちください。"
          : undefined
      }
      sideContent={
        isSessionLoading ? (
          <div className="grid gap-3" aria-hidden="true">
            <div className="h-28 rounded-[24px] border border-white/8 bg-white/6" />
            <div className="h-24 rounded-[22px] border border-white/6 bg-white/4" />
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-5 justify-items-start">
              <BrandWordmark
                className="max-w-[440px]"
                symbolClassName="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
              />
              <div className="grid gap-3">
                <p className="text-[clamp(2rem,4.8vw,3.4rem)] leading-[0.96] tracking-[-0.06em] text-white">
                  次に見る一本を、決める。
                </p>
                <p className="text-[1rem] leading-7 text-white/72">
                  みるカンは、積んだ映画やシリーズを整理して、次に何を見るか決めるアプリです。
                </p>
              </div>
            </div>
          </div>
        )
      }
    >
      {isSessionLoading ? (
        <h2 className="mb-2 text-[1.35rem] leading-[1.05] font-[var(--heading)] tracking-[-0.03em] text-foreground">
          セッション確認中
        </h2>
      ) : null}
      {isSessionLoading ? (
        <p className="mb-6 text-sm leading-6 text-muted-foreground">
          認証状態の復元後に backlog 画面へ移動します。
        </p>
      ) : null}
      {isSessionLoading ? (
        <div className="grid gap-4" aria-live="polite">
          <div className="grid gap-2">
            <div className="h-4 w-28 rounded-full bg-muted/70" />
            <div className="h-10 rounded-lg border border-border/70 bg-muted/40" />
          </div>
          <div className="grid gap-2">
            <div className="h-4 w-24 rounded-full bg-muted/70" />
            <div className="h-10 rounded-lg border border-border/70 bg-muted/40" />
          </div>
          <div className="h-10 rounded-lg bg-primary/35" />
          <div className="rounded-[20px] border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            セッションを確認しています...
          </div>
        </div>
      ) : (
        <LoginPageAuthForm auth={auth} />
      )}
    </AuthScreen>
  );
}
