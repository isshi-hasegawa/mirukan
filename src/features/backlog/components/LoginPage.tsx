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
            <div className="grid gap-6">
              <BrandWordmark className="max-w-[420px]" symbolClassName="h-24 w-24 shrink-0 object-contain" />
              <div className="grid gap-4">
                <p className="max-w-[26ch] text-[clamp(1.55rem,2.4vw,2.45rem)] leading-[1.12] tracking-[-0.05em] text-white">
                  みるカンは、その時の自分に合う 1
                  本を決めるための、映像作品のバックログ兼意思決定アプリです
                </p>
                <p className="max-w-[44ch] text-[0.98rem] leading-7 text-[rgba(255,255,255,0.7)]">
                  積みっぱなしを並べ替えながら、今の気分に合う 1 本へ絞り込みます。
                </p>
              </div>
            </div>
          </div>
        )
      }
    >
      <h2 className="mb-2 text-[1.35rem] leading-[1.05] font-[var(--heading)] tracking-[-0.03em] text-foreground">
        {isSessionLoading ? "セッション確認中" : "ログイン"}
      </h2>
      <p className="mb-6 text-sm leading-6 text-muted-foreground">
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
          className="grid gap-4.5"
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
