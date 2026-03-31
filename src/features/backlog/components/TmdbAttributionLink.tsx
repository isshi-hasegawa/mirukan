import { siThemoviedatabase } from "simple-icons";

export function TmdbAttributionLink() {
  return (
    <a
      href="https://www.themoviedb.org/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="TMDB を開く"
      title="TMDB を開く"
      className="inline-flex w-fit items-center gap-3 rounded-2xl border border-border bg-background/50 px-3.5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-[#01d277] shadow-[0_8px_18px_rgba(0,0,0,0.16)]">
        <svg
          className="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          dangerouslySetInnerHTML={{ __html: siThemoviedatabase.svg }}
          aria-hidden="true"
        />
      </span>
      <span className="leading-none">TMDB</span>
    </a>
  );
}
