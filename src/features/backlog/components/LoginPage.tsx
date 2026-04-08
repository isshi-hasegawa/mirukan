import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { supabase } from "../../../lib/supabase.ts";
import { AuthScreen } from "./AuthScreen.tsx";
import { BrandWordmark } from "./BrandWordmark.tsx";

type Props = {
  isSessionLoading?: boolean;
  showDevLoginHint?: boolean;
};

type AuthMode = "login" | "signUp" | "forgotPassword";

const DEV_EMAIL = "akari@example.com";
const DEV_PASSWORD = "password123";

export function getAuthRedirectUrl(location: Pick<Location, "origin" | "hostname">) {
  if (location.hostname === "www.mirukan.app") {
    return "https://mirukan.app";
  }

  return location.origin;
}

function getLoginErrorMessage(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (normalized.includes("email not confirmed")) {
    return "メールアドレスの確認が完了していません。確認メールのリンクを開いてからログインしてください。";
  }

  if (normalized.includes("too many requests")) {
    return "試行回数が多いため、少し時間をおいてから再度お試しください。";
  }

  return "ログインに失敗しました。時間をおいて再度お試しください。";
}

function getResetPasswordErrorMessage(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (normalized.includes("redirect")) {
    return "パスワード再設定メールの送信設定に問題があります。お手数ですが時間をおいて再度お試しください。";
  }

  if (normalized.includes("too many requests")) {
    return "試行回数が多いため、少し時間をおいてから再度お試しください。";
  }

  return "メールの送信に失敗しました。再度お試しください。";
}

export function LoginPage({
  isSessionLoading = false,
  showDevLoginHint = import.meta.env.DEV && import.meta.env.MODE !== "test",
}: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpPasswordConfirmation, setSignUpPasswordConfirmation] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [hasSentResetEmail, setHasSentResetEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSentConfirmationEmail, setHasSentConfirmationEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUpMode = authMode === "signUp";
  const isForgotPasswordMode = authMode === "forgotPassword";
  const email = isSignUpMode ? signUpEmail : loginEmail;
  const password = isSignUpMode ? signUpPassword : loginPassword;
  const authRedirectUrl = getAuthRedirectUrl(window.location);
  const shouldShowDevLoginHint =
    showDevLoginHint && !isSignUpMode && !isForgotPasswordMode && !isSessionLoading;

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
          emailRedirectTo: authRedirectUrl,
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
      setErrorMessage(getLoginErrorMessage(error.message));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: authRedirectUrl,
    });

    if (error) {
      setErrorMessage(getResetPasswordErrorMessage(error.message));
      setIsSubmitting(false);
      return;
    }

    setHasSentResetEmail(true);
    setIsSubmitting(false);
  };

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
        <form
          className="grid gap-4.5"
          onSubmit={(e) => {
            if (isForgotPasswordMode) {
              void handleForgotPassword(e);
            } else {
              void handleSubmit(e);
            }
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
              aria-pressed={!isSignUpMode && !isForgotPasswordMode}
              disabled={isSubmitting}
              onClick={() => {
                setAuthMode("login");
                setErrorMessage("");
                setHasSentConfirmationEmail(false);
                setHasSentResetEmail(false);
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
                setHasSentResetEmail(false);
              }}
            >
              新規登録
            </Button>
          </div>
          <div className="grid min-h-[29rem] content-center gap-4.5">
            {isForgotPasswordMode ? (
              hasSentResetEmail ? (
                <>
                  <div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-4">
                    <p className="text-sm font-medium text-foreground">
                      リセットメールを送信しました
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {resetEmail}{" "}
                      宛てにパスワードリセット用のリンクを送信しました。メール内のリンクを開いて、パスワードを再設定してください。
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      setAuthMode("login");
                      setLoginEmail(resetEmail);
                      setErrorMessage("");
                      setHasSentResetEmail(false);
                    }}
                  >
                    ログインへ戻る
                  </Button>
                </>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="reset-email">メールアドレス</Label>
                    <Input
                      id="reset-email"
                      name="reset-email"
                      type="email"
                      autoComplete="email"
                      value={resetEmail}
                      disabled={isSubmitting}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    登録済みのメールアドレスにパスワードリセット用のリンクを送信します。
                  </p>
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "送信しています..." : "リセットメールを送信"}
                  </Button>
                </>
              )
            ) : isSignUpMode && hasSentConfirmationEmail ? (
              <>
                <div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">確認メールを送信しました</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {signUpEmail}{" "}
                    宛てに確認メールを送信しました。メール内のリンクを開いて、アカウント登録を完了してください。
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
                    確認メールのリンクを開くと、アカウント登録が完了します。
                  </p>
                ) : null}
                {shouldShowDevLoginHint ? (
                  <div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-4">
                    <p className="text-sm font-medium text-foreground">開発用アカウント</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      ローカル検証では seed 済みアカウントを入力して利用できます。
                    </p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      {DEV_EMAIL} / {DEV_PASSWORD}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => {
                        setLoginEmail(DEV_EMAIL);
                        setLoginPassword(DEV_PASSWORD);
                        setErrorMessage("");
                      }}
                    >
                      開発用アカウントを入力する
                    </Button>
                  </div>
                ) : null}
                {isSignUpMode ? (
                  <p className="text-xs leading-6 text-muted-foreground">
                    登録することで、
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mx-1 underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
                    >
                      利用規約
                    </a>
                    および
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mx-1 underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
                    >
                      プライバシーポリシー
                    </a>
                    に同意したものとみなします。
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
                <div className="flex justify-center">
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {!isSignUpMode ? (
                      <button
                        type="button"
                        className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
                        onClick={() => {
                          setResetEmail(loginEmail);
                          setAuthMode("forgotPassword");
                          setErrorMessage("");
                        }}
                      >
                        パスワードを忘れた場合
                      </button>
                    ) : null}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
                    >
                      利用規約
                    </a>
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
                    >
                      プライバシーポリシー
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
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
