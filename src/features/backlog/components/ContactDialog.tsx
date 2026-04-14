import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { DialogShell } from "./DialogShell.tsx";

type Props = {
  onClose: () => void;
};

const GITHUB_ISSUES_URL = "https://github.com/isshi-hasegawa/mirukan/issues/new/choose";
const SUPPORT_EMAIL = "support@mirukan.app";

export function ContactDialog({ onClose }: Props) {
  return (
    <DialogShell
      titleId="contact-dialog-title"
      badge="Contact"
      title="お問い合わせ"
      closeLabel="お問い合わせを閉じる"
      onClose={onClose}
    >
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
    </DialogShell>
  );
}
