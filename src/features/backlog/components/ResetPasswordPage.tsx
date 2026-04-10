import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { updateUserPassword } from "../../../lib/auth-repository.ts";
import { AuthScreen } from "./AuthScreen.tsx";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== passwordConfirmation) {
      setErrorMessage("確認用パスワードが一致しません。");
      return;
    }

    setIsSubmitting(true);

    const { error } = await updateUserPassword(password);

    if (error) {
      setErrorMessage("パスワードの更新に失敗しました。再度お試しください。");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    // App.tsx が USER_UPDATED イベントを受け取り BoardPage へ遷移する
  };

  return (
    <AuthScreen>
      <form
        className="grid gap-4.5"
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <div className="grid gap-1.5">
          <h2 className="text-[1.35rem] leading-[1.05] font-[var(--heading)] tracking-[-0.03em] text-foreground">
            パスワードの再設定
          </h2>
          <p className="mb-2 text-sm leading-6 text-muted-foreground">
            新しいパスワードを入力してください。
          </p>
        </div>
        <div className="grid gap-4.5">
          <div className="grid gap-2">
            <Label htmlFor="password">新しいパスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={isSubmitting}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password-confirmation">確認用パスワード</Label>
            <Input
              id="password-confirmation"
              name="password-confirmation"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              disabled={isSubmitting}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "更新しています..." : "パスワードを更新する"}
          </Button>
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
    </AuthScreen>
  );
}
