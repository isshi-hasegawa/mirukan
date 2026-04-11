import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import type { BacklogFeedback, ToastOptions, ToastResult } from "../ui-feedback.ts";

type ConfirmState = {
  message: string;
  resolve: (result: boolean) => void;
};

type ToastState = {
  message: string;
  undoLabel?: string;
  timeoutMs: number;
  resolve: (result: ToastResult) => void;
};

function buildNextToastState(
  current: ToastState | null,
  message: string,
  options: ToastOptions | undefined,
  resolve: (result: ToastResult) => void,
): ToastState {
  // 既存トーストがあれば先に settle して Promise を解決させる
  current?.resolve({ undone: false });
  return {
    message,
    undoLabel: options?.undoLabel,
    timeoutMs: options?.timeoutMs ?? 5000,
    resolve,
  };
}

function FeedbackAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-[560px] rounded-[24px] border border-border bg-[rgba(28,28,28,0.96)] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm leading-6 text-foreground">{message}</p>
          <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeedbackConfirmDialog({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,0,0,0.48)] px-4 backdrop-blur-[6px]">
      <section
        className="w-full max-w-[480px] rounded-[28px] border border-border bg-[rgba(28,28,28,0.98)] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="backlog-feedback-confirm-title"
      >
        <h2 id="backlog-feedback-confirm-title" className="text-lg font-semibold">
          確認
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" className="rounded-full" onClick={onCancel}>
            キャンセル
          </Button>
          <Button type="button" className="rounded-full" onClick={onConfirm}>
            続ける
          </Button>
        </div>
      </section>
    </div>
  );
}

function ToastNotification({
  message,
  undoLabel,
  timeoutMs,
  onUndo,
  onClose,
}: Readonly<{
  message: string;
  undoLabel?: string;
  timeoutMs: number;
  onUndo: () => void;
  onClose: () => void;
}>) {
  useEffect(() => {
    const id = setTimeout(onClose, timeoutMs);
    return () => clearTimeout(id);
  }, [onClose, timeoutMs]);

  return (
    <div className="fixed bottom-4 right-4 z-50" role="status" aria-live="polite">
      <div className="w-full max-w-[360px] rounded-[24px] border border-border bg-[rgba(28,28,28,0.96)] px-5 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm leading-6 text-foreground">{message}</p>
          {undoLabel ? (
            <Button
              type="button"
              variant="outline"
              className="shrink-0 rounded-full"
              onClick={onUndo}
            >
              {undoLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function useBacklogFeedback() {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toastState, setToastState] = useState<ToastState | null>(null);

  useEffect(() => {
    return () => {
      setConfirmState((current) => {
        current?.resolve(false);
        return null;
      });
      setToastState((current) => {
        current?.resolve({ undone: false });
        return null;
      });
    };
  }, []);

  const feedback = useMemo<BacklogFeedback>(
    () => ({
      alert: async (message) => {
        setAlertMessage(message);
      },
      confirm: (message) =>
        new Promise<boolean>((resolve) => {
          setConfirmState({ message, resolve });
        }),
      toast: (message, options) =>
        new Promise<ToastResult>((resolve) => {
          setToastState((current) => buildNextToastState(current, message, options, resolve));
        }),
    }),
    [],
  );

  const handleCloseAlert = () => {
    setAlertMessage(null);
  };

  const settleConfirm = (result: boolean) => {
    setConfirmState((current) => {
      current?.resolve(result);
      return null;
    });
  };

  const settleToast = (undone: boolean) => {
    setToastState((current) => {
      current?.resolve({ undone });
      return null;
    });
  };

  const feedbackUi = (
    <>
      {toastState ? (
        <ToastNotification
          message={toastState.message}
          undoLabel={toastState.undoLabel}
          timeoutMs={toastState.timeoutMs}
          onUndo={() => settleToast(true)}
          onClose={() => settleToast(false)}
        />
      ) : null}
      {alertMessage ? <FeedbackAlert message={alertMessage} onClose={handleCloseAlert} /> : null}
      {confirmState ? (
        <FeedbackConfirmDialog
          message={confirmState.message}
          onCancel={() => settleConfirm(false)}
          onConfirm={() => settleConfirm(true)}
        />
      ) : null}
    </>
  );

  return { feedback, feedbackUi };
}
