import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { supabase } from "../../../lib/supabase.ts";
import { AuthScreen } from "./AuthScreen.tsx";
import { BrandWordmark } from "./BrandWordmark.tsx";

type Props = {
  isSessionLoading?: boolean;
};

type AuthMode = "login" | "signUp";

const DEV_EMAIL = "akari@example.com";
const DEV_PASSWORD = "password123";

export function LoginPage({ isSessionLoading = false }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState(DEV_EMAIL);
  const [loginPassword, setLoginPassword] = useState(DEV_PASSWORD);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpPasswordConfirmation, setSignUpPasswordConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSentConfirmationEmail, setHasSentConfirmationEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUpMode = authMode === "signUp";
  const email = isSignUpMode ? signUpEmail : loginEmail;
  const password = isSignUpMode ? signUpPassword : loginPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (isSignUpMode && password !== signUpPasswordConfirmation) {
      setErrorMessage("確認用パスワードが一致しません。");
      return;
    }

    setIsSubmitting(true);

    if (isSignUpMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setErrorMessage(`新規登録に失敗しました: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      setHasSentConfirmationEmail(!data.session);
      setSignUpPassword("");
      setSignUpPasswordConfirmation("");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(`ログインに失敗しました: ${error.message}`);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <AuthScreen
      badge={isSessionLoading ? "AUTH" : undefined}
      title={isSessionLoading ? "みるカン" : undefined}
      description={
        isSessionLoading
          ? "ローカル Supabase のセッションを確認しています。画面の準備ができるまで、このままお待ちください。"
          : undefined
      }
      sideContent={
        isSessionLoading ? (
          <div className="grid gap-3" aria-hidden="true">
            <div className="h-28 rounded-[24px] border border-white/8 bg-white/6" />
            <div className="h-24 rounded-[22px] border border-white/6 bg-white/4" />
          </div>
        ) : (
          <div className="grid gap-7">
            <div className="grid gap-7">
              <BrandWordmark
                className="max-w-[440px]"
                symbolClassName="h-28 w-28 shrink-0 object-contain"
              />
              <div className="grid gap-4">
                <p className="max-w-[30ch] text-[clamp(1.32rem,1.95vw,1.92rem)] leading-[1.18] tracking-[-0.04em] text-white/96">
                  みるカンは、次に見る 1 本を決めるための映像作品バックログです
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
        <form
          className="grid gap-4.5"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <div
            className="grid grid-cols-2 gap-1 rounded-[18px] border border-border/70 bg-muted/30 p-1"
            role="tablist"
            aria-label="認証モード"
          >
            <Button
              type="button"
              variant={isSignUpMode ? "ghost" : "secondary"}
              size="lg"
              aria-pressed={!isSignUpMode}
              disabled={isSubmitting}
              onClick={() => {
                setAuthMode("login");
                setErrorMessage("");
                setHasSentConfirmationEmail(false);
              }}
            >
              ログイン
            </Button>
            <Button
              type="button"
              variant={isSignUpMode ? "secondary" : "ghost"}
              size="lg"
              aria-pressed={isSignUpMode}
              disabled={isSubmitting}
              onClick={() => {
                setAuthMode("signUp");
                setErrorMessage("");
                setHasSentConfirmationEmail(false);
              }}
            >
              新規登録
            </Button>
          </div>
          {isSignUpMode && hasSentConfirmationEmail ? (
            <>
              <div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-4">
                <p className="text-sm font-medium text-foreground">確認メールを送信しました</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {signUpEmail} 宛てに確認メールを送りました。メール内のリンクから登録を完了してください。
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={() => {
                  setAuthMode("login");
                  setLoginEmail(signUpEmail);
                  setLoginPassword("");
                  setErrorMessage("");
                  setHasSentConfirmationEmail(false);
                }}
              >
                ログインへ戻る
              </Button>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    if (isSignUpMode) {
                      setSignUpEmail(e.target.value);
                      return;
                    }

                    setLoginEmail(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUpMode ? "new-password" : "current-password"}
                  value={password}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    if (isSignUpMode) {
                      setSignUpPassword(e.target.value);
                      return;
                    }

                    setLoginPassword(e.target.value);
                  }}
                  required
                />
              </div>
              {isSignUpMode ? (
                <div className="grid gap-2">
                  <Label htmlFor="password-confirmation">確認用パスワード</Label>
                  <Input
                    id="password-confirmation"
                    name="password-confirmation"
                    type="password"
                    autoComplete="new-password"
                    value={signUpPasswordConfirmation}
                    disabled={isSubmitting}
                    onChange={(e) => setSignUpPasswordConfirmation(e.target.value)}
                    required
                  />
                </div>
              ) : null}
              {isSignUpMode ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  登録後に確認メールを送信します。メール内のリンクから登録を完了してください。
                </p>
              ) : null}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting
                  ? isSignUpMode
                    ? "確認メールを送信しています..."
                    : "ログインしています..."
                  : isSignUpMode
                    ? "確認メールを送信して登録"
                    : "ログイン"}
              </Button>
            </>
          )}
          {errorMessage ? (
            <p
              className="rounded-[20px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-[0.94rem] text-foreground"
              aria-live="polite"
            >
              {errorMessage}
            </p>
          ) : null}
        </form>
      )}
    </AuthScreen>
  );
}
