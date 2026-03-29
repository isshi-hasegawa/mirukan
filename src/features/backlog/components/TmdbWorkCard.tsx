import { FilmIcon, TvIcon, CheckIcon } from "@heroicons/react/24/outline";
import { siThemoviedatabase } from "simple-icons";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { platformLabels } from "../constants.ts";

type Props = {
  result: TmdbSearchResult;
  isSelected?: boolean;
  onSelect?: () => void;
  onAddToStacked?: () => void;
  isChecked?: boolean;
};

export function TmdbWorkCard({ result, isSelected, onSelect, onAddToStacked, isChecked }: Props) {
  const posterUrl = result.posterPath
    ? `https://image.tmdb.org/t/p/w185${result.posterPath}`
    : null;

  const checkButton = onAddToStacked ? (
    <button
      type="button"
      className={`group shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center self-center transition-colors cursor-pointer ${
        isChecked
          ? "bg-[rgb(191,90,54)] border-[rgb(191,90,54)]"
          : "border-[rgba(255,255,255,0.3)] hover:border-[rgba(255,255,255,0.5)]"
      }`}
      aria-label="ストックに追加"
      title="ストックに追加"
      onClick={(e) => {
        e.stopPropagation();
        onAddToStacked();
      }}
    >
      <CheckIcon
        className={`w-4 h-4 text-white transition-opacity ${
          isChecked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
        aria-hidden="true"
      />
    </button>
  ) : null;

  const cardContent = (
    <>
      {checkButton}
      <div
        className="overflow-hidden rounded-xl aspect-[2/3] border border-[rgba(92,59,35,0.08)] shrink-0 w-14"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,208,143,0.42), transparent 36%), linear-gradient(180deg, rgba(191,90,54,0.14), rgba(92,59,35,0.08))",
        }}
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={`${result.title} のポスター`}
            className="w-full h-full object-cover block"
          />
        ) : (
          <div className="w-full h-full grid place-items-center p-1.5 text-muted-foreground text-[0.62rem] text-center leading-[1.3]">
            No Poster
          </div>
        )}
      </div>
      <div className="grid gap-1 min-w-0">
        <span className="font-bold">{result.title}</span>
        <span className="flex items-center gap-1 text-muted-foreground text-[0.88rem]">
          {result.workType === "movie" ? (
            <FilmIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <TvIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
          {result.workType === "movie" ? "映画" : "シリーズ"}
          {result.releaseDate && ` · ${result.releaseDate.slice(0, 4)}`}
        </span>
        {result.jpWatchPlatforms.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {result.jpWatchPlatforms.map(({ key, logoPath }) => {
              const label = platformLabels[key as keyof typeof platformLabels];
              if (!label) return null;
              return logoPath ? (
                <img
                  key={key}
                  src={`https://image.tmdb.org/t/p/w45${logoPath}`}
                  alt={label}
                  title={label}
                  className="w-5 h-5 rounded-[4px] object-cover shrink-0"
                />
              ) : (
                <span
                  key={key}
                  className="inline-block px-[7px] py-[1px] rounded-full text-[0.78rem] bg-black/[0.07] text-muted-foreground whitespace-nowrap"
                >
                  {label}
                </span>
              );
            })}
          </span>
        )}
        {result.overview && (
          <span className="text-muted-foreground text-[0.88rem] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [display:-webkit-box] overflow-hidden">
            {result.overview}
          </span>
        )}
      </div>
    </>
  );

  const tmdbHref = `https://www.themoviedb.org/${result.tmdbMediaType}/${result.tmdbId}`;

  const tmdbLink = (
    <a
      href={tmdbHref}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute top-2 right-2 inline-flex items-center gap-[3px] px-1.5 py-[3px] rounded-full bg-white/90 text-[#5c3b23] no-underline z-10 hover:bg-white focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-0.5"
      aria-label="TMDbで作品を開く"
      title="TMDbで作品を開く"
      onClick={(e) => e.stopPropagation()}
    >
      <svg
        className="w-[22px] h-[22px]"
        viewBox="0 0 24 24"
        dangerouslySetInnerHTML={{ __html: siThemoviedatabase.svg }}
        aria-hidden="true"
      />
    </a>
  );

  const gridCols = onAddToStacked
    ? "grid-cols-[24px_56px_minmax(0,1fr)]"
    : "grid-cols-[56px_minmax(0,1fr)]";

  return onSelect ? (
    <div className="relative">
      <button
        className={`grid ${gridCols} gap-3 items-start w-full px-4 py-3.5 border rounded-2xl bg-[#353535] text-foreground text-left cursor-pointer transition-[border-color,box-shadow] duration-150${
          isSelected
            ? " border-[rgba(191,90,54,0.45)] shadow-[inset_0_0_0_1px_rgba(191,90,54,0.2)]"
            : " border-[rgba(92,59,35,0.2)]"
        }`}
        type="button"
        onClick={onSelect}
      >
        {cardContent}
      </button>
      {tmdbLink}
    </div>
  ) : (
    <div className="relative w-full">
      <div
        className={`grid ${gridCols} gap-3 items-start w-full px-4 py-3.5 border border-[rgba(92,59,35,0.2)] rounded-2xl bg-[#353535] text-foreground cursor-default`}
      >
        {cardContent}
      </div>
      {tmdbLink}
    </div>
  );
}
