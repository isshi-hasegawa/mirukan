import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { supabase } from "../../../lib/supabase.ts";
import { AuthScreen } from "./AuthScreen.tsx";
import { BrandLogo } from "./BrandLogo.tsx";

type Props = {
  isSessionLoading?: boolean;
};

const DEV_EMAIL = "akari@example.com";
const DEV_PASSWORD = "password123";

function getMessageTone(message: string) {
  if (message.startsWith("ログインに失敗")) {
    return "error";
  }

  if (message.startsWith("ログインに成功")) {
    return "success";
  }

  return "muted";
}

export function LoginPage({ isSessionLoading = false }: Props) {
  const [email, setEmail] = useState(DEV_EMAIL);
  const [password, setPassword] = useState(DEV_PASSWORD);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messageTone = getMessageTone(message);
  const statusClassName =
    messageTone === "error"
      ? "border-destructive/40 bg-destructive/10 text-foreground"
      : messageTone === "success"
        ? "border-primary/40 bg-primary/10 text-foreground"
        : "border-border/70 bg-muted/40 text-muted-foreground";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("ログインしています...");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(`ログインに失敗しました: ${error.message}`);
      setIsSubmitting(false);
      return;
    }

    setMessage("ログインに成功しました。");
  };

  return (
    <AuthScreen
      badge={isSessionLoading ? "AUTH" : "LOCAL AUTH"}
      title="みるカン"
      description={
        isSessionLoading
          ? "ローカル Supabase のセッションを確認しています。画面の準備ができるまで、このままお待ちください。"
          : "次に見る作品を決めるための、映像作品バックログ。"
      }
      sideContent={
        isSessionLoading ? (
          <div className="grid gap-3" aria-hidden="true">
            <div className="h-24 rounded-[20px] border border-border/70 bg-muted/50" />
            <div className="h-24 rounded-[20px] border border-border/70 bg-muted/30" />
          </div>
        ) : (
          <div className="grid gap-5">
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-orange-400/40 bg-linear-to-br from-orange-400/20 via-orange-500/10 to-white/5 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <BrandLogo className="h-auto w-full max-w-[240px] object-contain object-left" />
              </div>
              <div className="grid gap-2">
                <p className="max-w-[20ch] text-[clamp(1.6rem,2.2vw,2.2rem)] leading-[1.08] tracking-[-0.04em] text-foreground">
                  次に見る作品を決めるためのカンバン。
                </p>
              </div>
            </div>
          </div>
        )
      }
    >
      <h2 className="mb-2 text-[1.15rem] leading-[1.1] font-[var(--heading)] text-foreground">
        {isSessionLoading ? "セッション確認中" : "ログイン"}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        {isSessionLoading
          ? "認証状態の復元後に backlog 画面へ移動します。"
          : "ログインしてバックログを開きます。"}
      </p>
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
          className="grid gap-4"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled={isSubmitting}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={isSubmitting}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "ログインしています..." : "ログインして backlog を見る"}
          </Button>
          <p
            className={`rounded-[20px] border px-4 py-3 text-[0.94rem] ${statusClassName}`}
            aria-live="polite"
          >
            {message}
          </p>
        </form>
      )}
    </AuthScreen>
  );
}
