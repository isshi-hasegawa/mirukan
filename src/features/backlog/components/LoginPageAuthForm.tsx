import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { lazyNamed } from "../../../lib/lazy-component.ts";
import { useLoginPageAuth } from "../hooks/useLoginPageAuth.ts";

const ContactDialog = lazyNamed(() => import("./ContactDialog.tsx"), "ContactDialog");

type LoginPageAuthModel = ReturnType<typeof useLoginPageAuth>;

type Props = Readonly<{
  auth: LoginPageAuthModel;
}>;

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

function TermsAndPrivacyLinks({ onOpenContact }: { onOpenContact: () => void }) {
  return (
    <div className="flex justify-center">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
        <button
          type="button"
          className="underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
          onClick={onOpenContact}
        >
          お問い合わせ
        </button>
      </div>
    </div>
  );
}

function GoogleLoginButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Googleでログイン"
      className="group relative box-border mx-auto h-10 w-full max-w-[400px] overflow-hidden rounded-[20px] border border-[#747775] bg-white px-3 text-center align-middle font-['Roboto',Arial,sans-serif] text-sm tracking-[0.25px] text-[#1f1f1f] whitespace-nowrap outline-none transition-[background-color,border-color,box-shadow] duration-[218ms] ease-in-out hover:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] focus-visible:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] disabled:cursor-default disabled:border-[#1f1f1f1f] disabled:bg-[#ffffff61]"
      disabled={disabled}
      onClick={onClick}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[#303030] opacity-0 transition-opacity duration-[218ms] group-hover:opacity-[0.08] group-focus-visible:opacity-[0.12] group-active:opacity-[0.12]"
      />
      <span className="relative flex h-full w-full items-center justify-between">
        <span className="mr-2.5 flex h-5 min-w-5 w-5 items-center justify-center">
          <GoogleIcon />
        </span>
        <span className="grow overflow-hidden text-ellipsis align-top font-medium opacity-100 group-disabled:opacity-[0.38]">
          Googleでログイン
        </span>
        <span className="sr-only">Googleでログイン</span>
      </span>
    </button>
  );
}

function ModeSwitcher({ auth }: Props) {
  return (
    <div
      className="grid grid-cols-2 gap-1 rounded-[18px] border border-border/70 bg-muted/30 p-1"
      role="tablist"
      aria-label="認証モード"
    >
      <Button
        type="button"
        variant={auth.isSignUpMode ? "ghost" : "secondary"}
        size="lg"
        aria-pressed={!auth.isSignUpMode && !auth.isForgotPasswordMode}
        disabled={auth.isSubmitting}
        onClick={auth.switchToLogin}
      >
        ログイン
      </Button>
      <Button
        type="button"
        variant={auth.isSignUpMode ? "secondary" : "ghost"}
        size="lg"
        aria-pressed={auth.isSignUpMode}
        disabled={auth.isSubmitting}
        onClick={auth.switchToSignUp}
      >
        新規登録
      </Button>
    </div>
  );
}

function LoginFormContent({ auth, onOpenContact }: Props & { onOpenContact: () => void }) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={auth.loginEmail}
          disabled={auth.isSubmitting}
          onChange={(e) => auth.setLoginEmail(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">パスワード</Label>
          <button
            type="button"
            className="text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60"
            onClick={auth.switchToForgotPassword}
          >
            パスワードを忘れた場合
          </button>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={auth.loginPassword}
          disabled={auth.isSubmitting}
          onChange={(e) => auth.setLoginPassword(e.target.value)}
          required
        />
      </div>
      {auth.shouldShowDevLoginHint ? (
        <div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-4">
          <p className="text-sm font-medium text-foreground">開発用アカウント</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            ローカル検証では seed 済みアカウントを入力して利用できます。
          </p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {auth.devLoginCredentials?.email} / {auth.devLoginCredentials?.password}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={auth.fillDevAccount}
          >
            開発用アカウントを入力する
          </Button>
        </div>
      ) : null}
      <Button
        type="submit"
        className="mx-auto w-full max-w-[400px]"
        size="lg"
        disabled={auth.isSubmitting}
      >
        {auth.isSubmitting ? "ログインしています..." : "ログイン"}
      </Button>
      <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border/60" />
        または
        <div className="h-px flex-1 bg-border/60" />
      </div>
      <GoogleLoginButton
        disabled={auth.isSubmitting}
        onClick={() => void auth.handleGoogleLogin()}
      />
      <TermsAndPrivacyLinks onOpenContact={onOpenContact} />
    </>
  );
}

function SignUpFormContent({ auth, onOpenContact }: Props & { onOpenContact: () => void }) {
  return (
    <>
      {auth.hasSentConfirmationEmail ? (
        <>
          <div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-4">
            <p className="text-sm font-medium text-foreground">確認メールを送信しました</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {auth.signUpEmail}{" "}
              宛てに確認メールを送信しました。メール内のリンクを開いて、アカウント登録を完了してください。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={auth.returnToLoginAfterSignUp}
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
              value={auth.signUpEmail}
              disabled={auth.isSubmitting}
              onChange={(e) => auth.setSignUpEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={auth.signUpPassword}
              disabled={auth.isSubmitting}
              onChange={(e) => auth.setSignUpPassword(e.target.value)}
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
              value={auth.signUpPasswordConfirmation}
              disabled={auth.isSubmitting}
              onChange={(e) => auth.setSignUpPasswordConfirmation(e.target.value)}
              required
            />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            確認メールのリンクを開くと、アカウント登録が完了します。
          </p>
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
          <Button
            type="submit"
            className="mx-auto w-full max-w-[400px]"
            size="lg"
            disabled={auth.isSubmitting}
          >
            {auth.isSubmitting ? "確認メールを送信しています..." : "確認メールを送信して登録"}
          </Button>
          <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border/60" />
            または
            <div className="h-px flex-1 bg-border/60" />
          </div>
          <GoogleLoginButton
            disabled={auth.isSubmitting}
            onClick={() => void auth.handleGoogleLogin()}
          />
          <TermsAndPrivacyLinks onOpenContact={onOpenContact} />
        </>
      )}
    </>
  );
}

function ForgotPasswordFormContent({ auth }: Props) {
  return auth.hasSentResetEmail ? (
    <>
      <div className="rounded-[20px] border border-border/70 bg-muted/30 px-4 py-4">
        <p className="text-sm font-medium text-foreground">リセットメールを送信しました</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {auth.resetEmail}{" "}
          宛てにパスワードリセット用のリンクを送信しました。メール内のリンクを開いて、パスワードを再設定してください。
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        size="lg"
        onClick={auth.returnToLoginAfterReset}
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
          value={auth.resetEmail}
          disabled={auth.isSubmitting}
          onChange={(e) => auth.setResetEmail(e.target.value)}
          required
        />
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        登録済みのメールアドレスにパスワードリセット用のリンクを送信します。
      </p>
      <Button
        type="submit"
        className="mx-auto w-full max-w-[400px]"
        size="lg"
        disabled={auth.isSubmitting}
      >
        {auth.isSubmitting ? "送信しています..." : "リセットメールを送信"}
      </Button>
    </>
  );
}

export function LoginPageAuthForm({ auth }: Props) {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <>
      <form
        className="grid gap-4.5"
        onSubmit={(e) => {
          e.preventDefault();
          void auth.handleSubmit();
        }}
      >
        <ModeSwitcher auth={auth} />
        <div className="grid min-h-[29rem] content-center gap-4.5">
          {auth.isForgotPasswordMode ? (
            <ForgotPasswordFormContent auth={auth} />
          ) : auth.isSignUpMode ? (
            <SignUpFormContent auth={auth} onOpenContact={() => setIsContactOpen(true)} />
          ) : (
            <LoginFormContent auth={auth} onOpenContact={() => setIsContactOpen(true)} />
          )}
        </div>
        {auth.errorMessage ? (
          <p
            className="rounded-[20px] border border-destructive/40 bg-destructive/10 px-4 py-3 text-[0.94rem] text-foreground"
            aria-live="polite"
          >
            {auth.errorMessage}
          </p>
        ) : null}
      </form>
      {isContactOpen ? (
        <Suspense fallback={null}>
          <ContactDialog onClose={() => setIsContactOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
