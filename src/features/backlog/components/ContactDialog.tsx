import { ArrowTopRightOnSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  onClose: () => void;
};

const GITHUB_ISSUES_URL = "https://github.com/isshi-hasegawa/mirukan/issues/new/choose";
const SUPPORT_EMAIL = "support@mirukan.app";

export function ContactDialog({ onClose }: Props) {
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
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(51,34,23,0.45)] p-5 backdrop-blur-[10px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-dialog-title"
        className="w-[min(calc(100%-32px),640px)] rounded-[28px] border border-border bg-[#2a2a2a] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-[720px]:rounded-[22px] max-[720px]:p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact</p>
            <h2 id="contact-dialog-title" className="text-xl font-semibold text-foreground">
              お問い合わせ
            </h2>
          </div>
          <button
            type="button"
            aria-label="お問い合わせを閉じる"
            className="rounded-full border border-border bg-background/40 p-2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 text-sm leading-7 text-muted-foreground">
          <p className="text-base leading-7 text-foreground">
            ご意見・ご要望・不具合のご報告など、お気軽にご連絡ください。
          </p>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
                Email
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                <span>{SUPPORT_EMAIL}</span>
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
              <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
                GitHub Issues
              </p>
              <a
                href={GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                <span>github.com/isshi-hasegawa/mirukan/issues</span>
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
