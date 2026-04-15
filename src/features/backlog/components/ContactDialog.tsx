import { ArrowTopRightOnSquareIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { DialogShell } from "./DialogShell.tsx";

type Props = Readonly<{
  onClose: () => void;
}>;

const GITHUB_ISSUES_URL = "https://github.com/isshi-hasegawa/mirukan/issues/new/choose";
const SUPPORT_EMAIL = "support@mirukan.app";

function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(SUPPORT_EMAIL).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        // Clipboard permission denied or API unavailable — silently ignore
      },
    );
  };

  return (
    <button
      type="button"
      aria-label={copied ? "コピーしました" : "メールアドレスをコピー"}
      className="rounded-lg border border-border/70 bg-background/35 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <ClipboardIcon className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}

export function ContactDialog({ onClose }: Props) {
  return (
    <DialogShell
      titleId="contact-dialog-title"
      badge="Contact"
      title="お問い合わせ"
      closeLabel="お問い合わせを閉じる"
      onClose={onClose}
    >
      <div className="grid gap-3">
        <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
            ご意見・ご要望
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</span>
            <CopyEmailButton />
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-primary uppercase">
            不具合のご報告
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
    </DialogShell>
  );
}
