export type ToastOptions = {
  onUndo?: () => void | Promise<void>;
};

export type BacklogFeedback = {
  alert: (message: string) => void | Promise<void>;
  confirm: (message: string) => boolean | Promise<boolean>;
  toast: (message: string, options?: ToastOptions) => void;
};

export const browserBacklogFeedback: BacklogFeedback = {
  alert: (message) => {
    globalThis.alert(message);
  },
  confirm: (message) => globalThis.confirm(message),
  toast: () => {},
};
