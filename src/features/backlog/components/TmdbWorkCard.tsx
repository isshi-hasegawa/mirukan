import { FilmIcon, TvIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { platformLabels } from "../constants.ts";
import { getTmdbSearchResultMetadataLabels } from "../helpers.ts";
import { RottenTomatoesBadge } from "./RottenTomatoesBadge.tsx";
import { TmdbLink } from "./TmdbLink.tsx";

type Props = Readonly<{
  result: TmdbSearchResult;
  isSelected?: boolean;
  onSelect?: () => void;
  onAddToStacked?: () => void;
  isChecked?: boolean;
  footer?: ReactNode;
  footerLayout?: "panel" | "inline";
}>;

function buildPosterUrl(posterPath: string | null) {
  return posterPath ? `https://image.tmdb.org/t/p/w185${posterPath}` : null;
}

function getRtVariant(score: number | null) {
  if (score === null) {
    return null;
  }

  return score >= 60 ? "fresh" : "rotten";
}

function getCardBorderClass(isSelected?: boolean) {
  return isSelected
    ? " border-[rgba(191,90,54,0.45)] shadow-[inset_0_0_0_1px_rgba(191,90,54,0.2)]"
    : " border-[rgba(92,59,35,0.2)]";
}

function WorkTypeLabel({ workType }: Readonly<{ workType: TmdbSearchResult["workType"] }>) {
  const icon =
    workType === "movie" ? (
      <FilmIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
    ) : (
      <TvIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
    );

  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {workType === "movie" ? "映画" : "シリーズ"}
    </span>
  );
}

function WatchPlatformBadge({
  logoPath,
  label,
}: Readonly<{
  logoPath: string | null;
  label: string;
}>) {
  if (logoPath) {
    return (
      <img
        src={`https://image.tmdb.org/t/p/w45${logoPath}`}
        alt={label}
        title={label}
        className="w-5 h-5 rounded-[4px] object-cover shrink-0"
      />
    );
  }

  return (
    <span className="inline-block px-[7px] py-[1px] rounded-full text-[0.78rem] bg-black/[0.07] text-muted-foreground whitespace-nowrap">
      {label}
    </span>
  );
}

function CardBody({
  result,
  checkButton,
}: Readonly<{
  result: TmdbSearchResult;
  checkButton: ReactNode;
}>) {
  const posterUrl = buildPosterUrl(result.posterPath);
  const rtScore = result.rottenTomatoesScore ?? null;
  const rtVariant = getRtVariant(rtScore);
  const metadataLabels = getTmdbSearchResultMetadataLabels(result);

  return (
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
      <div className="grid gap-1 min-w-0 pr-8">
        <span className="font-bold">{result.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-[0.88rem]">
          <WorkTypeLabel workType={result.workType} />
          {metadataLabels.map((label) => (
            <span key={label} className="text-[0.8rem] leading-none text-muted-foreground/80">
              {label}
            </span>
          ))}
          {rtScore !== null && rtVariant && (
            <RottenTomatoesBadge
              score={rtScore}
              variant={rtVariant}
              appearance="plain"
              className="text-[0.74rem]"
            />
          )}
        </span>
        {result.jpWatchPlatforms.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {result.jpWatchPlatforms.map(({ key, logoPath }) => {
              const label = platformLabels[key as keyof typeof platformLabels];
              if (!label) {
                return null;
              }

              return <WatchPlatformBadge key={key} logoPath={logoPath} label={label} />;
            })}
          </span>
        )}
        {result.overview?.trim() && (
          <span className="text-[0.88rem] text-muted-foreground [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [display:-webkit-box] overflow-hidden">
            {result.overview}
          </span>
        )}
      </div>
    </>
  );
}

function InlineCard({
  onSelect,
  isSelected,
  cardButtonClass,
  cardStaticClass,
  cardContent,
  footer,
}: Readonly<{
  onSelect?: () => void;
  isSelected?: boolean;
  cardButtonClass: string;
  cardStaticClass: string;
  cardContent: ReactNode;
  footer: ReactNode;
}>) {
  if (onSelect) {
    return (
      <div
        className={`overflow-hidden border rounded-2xl bg-[#353535] text-foreground${getCardBorderClass(isSelected)}`}
      >
        <button className={`${cardButtonClass} cursor-pointer`} type="button" onClick={onSelect}>
          {cardContent}
        </button>
        <div
          className="flex items-end justify-end gap-3 border-t border-[rgba(92,59,35,0.16)] px-4 py-3"
          data-footer-layout="inline"
        >
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-[rgba(92,59,35,0.2)] rounded-2xl bg-[#353535] text-foreground">
      <div className={cardStaticClass}>{cardContent}</div>
      <div
        className="flex items-end justify-end gap-3 border-t border-[rgba(92,59,35,0.16)] px-4 py-3"
        data-footer-layout="inline"
      >
        {footer}
      </div>
    </div>
  );
}

export function TmdbWorkCard({
  result,
  isSelected,
  onSelect,
  onAddToStacked,
  isChecked,
  footer,
  footerLayout = "panel",
}: Props) {
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

  const cardContent = <CardBody result={result} checkButton={checkButton} />;

  const tmdbHref = `https://www.themoviedb.org/${result.tmdbMediaType}/${result.tmdbId}`;

  const tmdbLink = (
    <TmdbLink
      href={tmdbHref}
      className="absolute top-2 right-2 z-10 h-8 w-8 focus-visible:outline-offset-0.5"
      iconClassName="h-[22px] w-[22px]"
      onClick={(e) => e.stopPropagation()}
    />
  );

  const gridCols = onAddToStacked
    ? "grid-cols-[24px_56px_minmax(0,1fr)]"
    : "grid-cols-[56px_minmax(0,1fr)]";

  const cardButtonClass = `grid ${gridCols} gap-3 items-start w-full px-4 py-3.5 text-left transition-[border-color,box-shadow] duration-150`;
  const cardStaticClass = `grid ${gridCols} gap-3 items-start w-full px-4 py-3.5 text-foreground cursor-default`;

  if (footer && footerLayout === "inline") {
    return (
      <div className="relative w-full">
        <InlineCard
          onSelect={onSelect}
          isSelected={isSelected}
          cardButtonClass={cardButtonClass}
          cardStaticClass={cardStaticClass}
          cardContent={cardContent}
          footer={footer}
        />
        {tmdbLink}
      </div>
    );
  }

  return onSelect ? (
    <div className="relative">
      <button
        className={`${cardButtonClass} border rounded-2xl bg-[#353535] text-foreground cursor-pointer${getCardBorderClass(isSelected)}`}
        type="button"
        onClick={onSelect}
      >
        {cardContent}
      </button>
      {footer && (
        <div
          className="mt-2 rounded-2xl border border-[rgba(92,59,35,0.16)] bg-[rgba(255,255,255,0.05)] px-4 py-3"
          data-footer-layout="panel"
        >
          {footer}
        </div>
      )}
      {tmdbLink}
    </div>
  ) : (
    <div className="relative w-full">
      <div
        className={`${cardStaticClass} border border-[rgba(92,59,35,0.2)] rounded-2xl bg-[#353535]`}
      >
        {cardContent}
      </div>
      {footer && (
        <div
          className="mt-2 rounded-2xl border border-[rgba(92,59,35,0.16)] bg-[rgba(255,255,255,0.05)] px-4 py-3"
          data-footer-layout="panel"
        >
          {footer}
        </div>
      )}
      {tmdbLink}
    </div>
  );
}
