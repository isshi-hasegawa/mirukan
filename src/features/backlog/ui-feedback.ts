export type BacklogToastOptions = {
  message: string;
  actionLabel?: string;
  durationMs?: number;
  onAction?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
};

export type BacklogFeedback = {
  alert: (message: string) => void | Promise<void>;
  confirm: (message: string) => boolean | Promise<boolean>;
  toast: (options: BacklogToastOptions) => void | Promise<void>;
};

export const browserBacklogFeedback: BacklogFeedback = {
  alert: (message) => {
    globalThis.alert(message);
  },
  confirm: (message) => globalThis.confirm(message),
  toast: ({ message }) => {
    globalThis.alert(message);
  },
};
