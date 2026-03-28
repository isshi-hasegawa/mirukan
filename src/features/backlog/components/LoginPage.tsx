import { useState } from "react";
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
    <main className="shell">
      <section className="intro-card">
        <h1>みるカンの土台を、まず本物のデータで見る。</h1>
        <p className="lead">
          ローカル Supabase に接続して、seed 済みの backlog をそのまま 5 列で確認できます。
        </p>
        <dl className="credentials">
          <div>
            <dt>メール</dt>
            <dd>
              <code>akari@example.com</code>
            </dd>
          </div>
          <div>
            <dt>パスワード</dt>
            <dd>
              <code>password123</code>
            </dd>
          </div>
        </dl>
      </section>

      <section className="auth-card">
        <h2>ローカルログイン</h2>
        <form
          className="auth-form"
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <label>
            <span>メールアドレス</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            <span>パスワード</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit">ログインして backlog を見る</button>
          <p className="form-message" aria-live="polite">
            {message}
          </p>
        </form>
      </section>
    </main>
  );
}
