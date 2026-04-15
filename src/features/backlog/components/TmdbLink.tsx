import { siThemoviedatabase } from "simple-icons";
import { cn } from "../../../lib/utils.ts";

type Props = Readonly<{
  href: string;
  className?: string;
  iconClassName?: string;
  ariaLabel?: string;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}>;

export function TmdbLink({
  href,
  className,
  iconClassName,
  ariaLabel = "TMDbで作品を開く",
  title = "TMDbで作品を開く",
  onClick,
}: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-white/92 text-[#5c3b23] no-underline shadow-[0_6px_18px_rgba(0,0,0,0.18)] transition-[background-color,box-shadow] hover:bg-white focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        className,
      )}
      aria-label={ariaLabel}
      title={title}
      onClick={onClick}
    >
      <svg
        className={cn("h-6 w-6 shrink-0", iconClassName)}
        viewBox="0 0 24 24"
        dangerouslySetInnerHTML={{ __html: siThemoviedatabase.svg }}
        aria-hidden="true"
      />
    </a>
  );
}
