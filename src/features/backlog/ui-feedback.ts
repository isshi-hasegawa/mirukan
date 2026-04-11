export type ToastOptions = {
  undoLabel?: string;
  timeoutMs?: number;
};

export type ToastResult = {
  undone: boolean;
};

export type BacklogFeedback = {
  alert: (message: string) => void | Promise<void>;
  confirm: (message: string) => boolean | Promise<boolean>;
  toast: (message: string, options?: ToastOptions) => Promise<ToastResult>;
};

export const browserBacklogFeedback: BacklogFeedback = {
  alert: (message) => {
    globalThis.alert(message);
  },
  confirm: (message) => globalThis.confirm(message),
  toast: (_message, options) =>
    new Promise<ToastResult>((resolve) => {
      setTimeout(() => resolve({ undone: false }), options?.timeoutMs ?? 5000);
    }),
};
