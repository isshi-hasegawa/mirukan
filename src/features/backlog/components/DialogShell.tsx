import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  titleId: string;
  badge: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function DialogShell({ titleId, badge, title, closeLabel, onClose, children }: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(51,34,23,0.45)] p-5 backdrop-blur-[10px]">
      {/* Backdrop: native button for click-outside-to-close (keyboard users use Escape) */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-[min(calc(100%-32px),640px)] rounded-[28px] border border-border bg-[#2a2a2a] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-[720px]:rounded-[22px] max-[720px]:p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{badge}</p>
            <h2 id={titleId} className="text-xl font-semibold text-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            className="rounded-full border border-border bg-background/40 p-2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </dialog>
    </div>,
    document.body,
  );
}
