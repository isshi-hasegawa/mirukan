import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { supabase } from "../../../lib/supabase.ts";

export function LoginPage() {
  const [email, setEmail] = useState("akari@example.com");
  const [password, setPassword] = useState("password123");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("ログインしています...");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`ログインに失敗しました: ${error.message}`);
    } else {
      setMessage("ログインに成功しました。");
    }
  };

  return (
    <main className="grid min-h-svh w-[min(1680px,calc(100%-20px))] mx-auto content-center grid-cols-1 login-cols gap-[18px] lg:items-start py-[14px]">
      {/* イントロカード */}
      <section className="border border-border bg-card/95 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] rounded-[28px] p-7">
        <p className="mb-2.5 text-[0.78rem] font-bold tracking-[0.18em] uppercase text-orange-400">
          PREVIEW
        </p>
        <h1 className="text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.95] tracking-[-0.05em] font-[var(--heading)] text-foreground">
          みるカンの土台を、まず本物のデータで見る。
        </h1>
        <p className="mt-[18px] max-w-[58ch] text-muted-foreground text-[1.02rem]">
          ローカル Supabase に接続して、seed 済みの backlog をそのまま 5 列で確認できます。
        </p>
        <dl className="mt-7 grid gap-3.5">
          <div className="grid gap-1.5 px-[18px] py-4 rounded-[18px] bg-orange-500/8">
            <dt className="text-muted-foreground text-[0.82rem]">メール</dt>
            <dd>
              <code className="inline-flex px-2.5 py-2 rounded-full bg-white/10 text-foreground font-mono text-[0.95rem]">
                akari@example.com
              </code>
            </dd>
          </div>
          <div className="grid gap-1.5 px-[18px] py-4 rounded-[18px] bg-orange-500/8">
            <dt className="text-muted-foreground text-[0.82rem]">パスワード</dt>
            <dd>
              <code className="inline-flex px-2.5 py-2 rounded-full bg-white/10 text-foreground font-mono text-[0.95rem]">
                password123
              </code>
            </dd>
          </div>
        </dl>
      </section>

      {/* 認証カード */}
      <section className="lg:self-center border border-border bg-card/95 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] rounded-[28px] p-7">
        <h2 className="mb-5 text-[1.15rem] leading-[1.1] font-[var(--heading)] text-foreground">
          ローカルログイン
        </h2>
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
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            ログインして backlog を見る
          </Button>
          <p className="text-muted-foreground text-[0.94rem]" aria-live="polite">
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}
