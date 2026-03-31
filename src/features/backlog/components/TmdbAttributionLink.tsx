import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { siThemoviedatabase } from "simple-icons";

export function TmdbAttributionLink() {
  return (
    <a
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="TMDB を開く"
      title="TMDB を開く"
      className="inline-flex w-fit items-end gap-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-[#01d277] shadow-[0_8px_18px_rgba(0,0,0,0.16)] ring-1 ring-black/5">
        <svg
          className="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          dangerouslySetInnerHTML={{ __html: siThemoviedatabase.svg }}
          aria-hidden="true"
        />
      </span>
      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}
