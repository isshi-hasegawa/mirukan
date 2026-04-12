import { useState } from "react";
import {
  resetPasswordForEmail,
  signInWithOAuth,
  signInWithPassword,
  signUp,
} from "../../../lib/auth-repository.ts";

type AuthMode = "login" | "signUp" | "forgotPassword";

export type DevLoginCredentials = Readonly<{
  email: string;
  password: string;
}>;

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

type UseLoginPageAuthOptions = {
  devLoginCredentials: DevLoginCredentials | null;
  showDevLoginHint: boolean;
};

export function useLoginPageAuth({
  devLoginCredentials,
  showDevLoginHint,
}: UseLoginPageAuthOptions) {
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
  const authRedirectUrl = getAuthRedirectUrl(globalThis.location);
  const shouldShowDevLoginHint =
    showDevLoginHint && devLoginCredentials !== null && !isSignUpMode && !isForgotPasswordMode;

  const resetStatusMessage = () => {
    setErrorMessage("");
    setHasSentConfirmationEmail(false);
    setHasSentResetEmail(false);
  };

  const switchToLogin = () => {
    setAuthMode("login");
    resetStatusMessage();
  };

  const switchToSignUp = () => {
    setAuthMode("signUp");
    resetStatusMessage();
  };

  const switchToForgotPassword = () => {
    setResetEmail(loginEmail);
    setAuthMode("forgotPassword");
    setErrorMessage("");
  };

  const returnToLoginAfterReset = () => {
    setAuthMode("login");
    setLoginEmail(resetEmail);
    setErrorMessage("");
    setHasSentResetEmail(false);
  };

  const returnToLoginAfterSignUp = () => {
    setAuthMode("login");
    setLoginEmail(signUpEmail);
    setLoginPassword("");
    setErrorMessage("");
    setHasSentConfirmationEmail(false);
  };

  const fillDevAccount = () => {
    if (!devLoginCredentials) {
      return;
    }

    setLoginEmail(devLoginCredentials.email);
    setLoginPassword(devLoginCredentials.password);
    setErrorMessage("");
  };

  const submitLoginOrSignUp = async () => {
    if (isSignUpMode && password !== signUpPasswordConfirmation) {
      setErrorMessage("確認用パスワードが一致しません。");
      return;
    }

    if (isSignUpMode) {
      const { data, error } = await signUp(email, password, {
        emailRedirectTo: authRedirectUrl,
      });

      if (error) {
        setErrorMessage(`新規登録に失敗しました: ${error.message}`);
        return;
      }

      setHasSentConfirmationEmail(!data.session);
      setSignUpPassword("");
      setSignUpPasswordConfirmation("");
      return;
    }

    const { error } = await signInWithPassword(email, password);

    if (error) {
      setErrorMessage(getLoginErrorMessage(error.message));
    }
  };

  const submitForgotPassword = async () => {
    const { error } = await resetPasswordForEmail(resetEmail, {
      redirectTo: authRedirectUrl,
    });

    if (error) {
      setErrorMessage(getResetPasswordErrorMessage(error.message));
      return;
    }

    setHasSentResetEmail(true);
  };

  const handleSubmit = async () => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      if (isForgotPasswordMode) {
        await submitForgotPassword();
        return;
      }

      await submitLoginOrSignUp();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error } = await signInWithOAuth({
        redirectTo: authRedirectUrl,
      });

      if (error) {
        setErrorMessage("Googleログインに失敗しました。再度お試しください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    authMode,
    isSignUpMode,
    isForgotPasswordMode,
    loginEmail,
    loginPassword,
    signUpEmail,
    signUpPassword,
    signUpPasswordConfirmation,
    resetEmail,
    hasSentResetEmail,
    errorMessage,
    hasSentConfirmationEmail,
    isSubmitting,
    devLoginCredentials,
    shouldShowDevLoginHint,
    setLoginEmail,
    setLoginPassword,
    setSignUpEmail,
    setSignUpPassword,
    setSignUpPasswordConfirmation,
    setResetEmail,
    switchToLogin,
    switchToSignUp,
    switchToForgotPassword,
    returnToLoginAfterReset,
    returnToLoginAfterSignUp,
    fillDevAccount,
    handleSubmit,
    handleGoogleLogin,
  };
}
