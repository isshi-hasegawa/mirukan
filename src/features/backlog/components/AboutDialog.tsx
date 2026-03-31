import { ArrowTopRightOnSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  onClose: () => void;
};

export function AboutDialog({ onClose }: Props) {
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
        aria-labelledby="about-dialog-title"
        className="w-[min(calc(100%-32px),640px)] rounded-[28px] border border-border bg-[#2a2a2a] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)] max-[720px]:rounded-[22px] max-[720px]:p-5"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">About</p>
            <h2 id="about-dialog-title" className="text-xl font-semibold text-foreground">
              みるカンについて
            </h2>
          </div>
          <button
            type="button"
            aria-label="About を閉じる"
            className="rounded-full border border-border bg-background/40 p-2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 text-sm leading-7 text-muted-foreground">
          <section className="grid gap-2">
            <p className="text-base leading-7 text-foreground">
              みるカンは、その時の自分に合う 1
              本を決めるための、映像作品のバックログ兼意思決定アプリです。
            </p>
            <ul className="grid gap-1.5 pl-5 text-sm text-muted-foreground">
              <li className="list-disc">積んだ作品を整理する</li>
              <li className="list-disc">次に見る作品を決めることに特化する</li>
            </ul>
          </section>

          <section className="grid gap-2 rounded-[20px] border border-[rgba(191,90,54,0.2)] bg-[rgba(191,90,54,0.07)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Data Source
            </p>
            <p className="text-sm leading-6 text-foreground">
              TMDB のデータおよび画像を利用しています。
            </p>
            <p className="text-sm leading-6">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/60 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <span>https://www.themoviedb.org/</span>
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}
