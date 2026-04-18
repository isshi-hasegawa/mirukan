import { useEffect, useState } from "react";
import type { SourceType } from "../types.ts";
import { buildIgdbImageUrl } from "../../../lib/igdb.ts";

type Props = Readonly<{
  posterPath: string | null;
  sourceType?: SourceType;
  alt: string;
  size?: "w92" | "w185" | "w500";
  fallback?: string;
  className?: string;
  fallbackClassName?: string;
}>;

export function PosterImage({
  posterPath,
  sourceType = "tmdb",
  alt,
  size = "w185",
  fallback = "No Poster",
  className,
  fallbackClassName,
}: Props) {
  const [hasError, setHasError] = useState(false);
  const url =
    sourceType === "igdb"
      ? buildIgdbImageUrl(posterPath, size === "w500" ? "cover_big" : "cover_small")
      : posterPath
        ? `https://image.tmdb.org/t/p/${size}${posterPath}`
        : null;

  useEffect(() => {
    setHasError(false);
  }, [url]);

  if (url && !hasError) {
    return <img className={className} src={url} alt={alt} onError={() => setHasError(true)} />;
  }

  return <div className={fallbackClassName}>{fallback}</div>;
}
