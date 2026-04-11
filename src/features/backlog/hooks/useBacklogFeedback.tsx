import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import type { BacklogFeedback, BacklogToastOptions } from "../ui-feedback.ts";

type ConfirmState = {
  message: string;
  resolve: (result: boolean) => void;
};

type ToastState = BacklogToastOptions & {
  id: string;
};

function FeedbackAlert({ message, onClose }: Readonly<{ message: string; onClose: () => void }>) {
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
}: Readonly<{
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
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

function FeedbackToast({
  toast,
  onAction,
  onClose,
}: Readonly<{
  toast: ToastState;
  onAction: (toast: ToastState) => void;
  onClose: (toast: ToastState) => void;
}>) {
  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      onClose(toast);
    }, toast.durationMs ?? 5000);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [onClose, toast]);

  return (
    <div className="w-full max-w-[420px] rounded-[22px] border border-border bg-[rgba(28,28,28,0.96)] px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-sm leading-6 text-foreground">{toast.message}</p>
        <div className="flex shrink-0 items-center gap-2">
          {toast.actionLabel ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onAction(toast)}
            >
              {toast.actionLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3"
            onClick={() => onClose(toast)}
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useBacklogFeedback() {
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastsRef = useRef<ToastState[]>([]);

  const updateToasts = useCallback((nextToasts: ToastState[]) => {
    toastsRef.current = nextToasts;
    setToasts(nextToasts);
  }, []);

  const removeToast = useCallback(
    (toastId: string) => {
      const nextToasts = toastsRef.current.filter((toast) => toast.id !== toastId);

      if (nextToasts.length === toastsRef.current.length) {
        return false;
      }

      updateToasts(nextToasts);
      return true;
    },
    [updateToasts],
  );

  const handleToastAction = useCallback(
    (toast: ToastState) => {
      if (!removeToast(toast.id)) {
        return;
      }

      void toast.onAction?.();
    },
    [removeToast],
  );

  const handleToastClose = useCallback(
    (toast: ToastState) => {
      if (!removeToast(toast.id)) {
        return;
      }

      void toast.onClose?.();
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      setConfirmState((current) => {
        current?.resolve(false);
        return null;
      });

      const pendingToasts = [...toastsRef.current];
      toastsRef.current = [];

      for (const toast of pendingToasts) {
        void toast.onClose?.();
      }
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
      toast: (options) => {
        const nextToasts = [
          ...toastsRef.current,
          {
            ...options,
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${toastsRef.current.length}`,
          },
        ];

        updateToasts(nextToasts);
      },
    }),
    [updateToasts],
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

  const feedbackUi = (
    <>
      {alertMessage ? <FeedbackAlert message={alertMessage} onClose={handleCloseAlert} /> : null}
      {confirmState ? (
        <FeedbackConfirmDialog
          message={confirmState.message}
          onCancel={() => settleConfirm(false)}
          onConfirm={() => settleConfirm(true)}
        />
      ) : null}
      {toasts.length > 0 ? (
        <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-3 px-4">
          {toasts.map((toast) => (
            <FeedbackToast
              key={toast.id}
              toast={toast}
              onAction={handleToastAction}
              onClose={handleToastClose}
            />
          ))}
        </div>
      ) : null}
    </>
  );

  return { feedback, feedbackUi };
}
