export type BacklogFeedback = {
  alert: (message: string) => void | Promise<void>;
  confirm: (message: string) => boolean | Promise<boolean>;
};

export const browserBacklogFeedback: BacklogFeedback = {
  alert: (message) => {
    window.alert(message);
  },
  confirm: (message) => window.confirm(message),
};
