import type { ReactNode } from "react";
import type { IgdbSearchResult } from "../../../lib/igdb.ts";
import { buildIgdbImageUrl } from "../../../lib/igdb.ts";
import {
  gamePlatformBackgrounds,
  gamePlatformIcons,
  gamePlatformLabels,
  workTypeIconUrls,
} from "../constants.ts";

type Props = Readonly<{
  result: IgdbSearchResult;
  isSelected?: boolean;
  onSelect?: () => void;
  footer?: ReactNode;
  footerLayout?: "panel" | "inline";
}>;

function getCardBorderClass(isSelected?: boolean) {
  return isSelected
    ? " border-[rgba(191,90,54,0.45)] shadow-[inset_0_0_0_1px_rgba(191,90,54,0.2)]"
    : " border-[rgba(92,59,35,0.2)]";
}

function GamePlatformBadge({
  platform,
}: Readonly<{ platform: IgdbSearchResult["platforms"][number] }>) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-[0.74rem] text-muted-foreground">
      <img
        src={gamePlatformIcons[platform]}
        alt=""
        className="h-4 w-4 rounded-sm p-[2px]"
        style={{ background: gamePlatformBackgrounds[platform] }}
        aria-hidden="true"
      />
      {gamePlatformLabels[platform]}
    </span>
  );
}

export function GameWorkCard({
  result,
  isSelected,
  onSelect,
  footer,
  footerLayout = "panel",
}: Props) {
  const coverUrl = buildIgdbImageUrl(result.coverImageId, "cover_small");
  const cardContent = (
    <>
      <div
        className="overflow-hidden rounded-xl aspect-[2/3] border border-[rgba(92,59,35,0.08)] shrink-0 w-14"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,208,143,0.42), transparent 36%), linear-gradient(180deg, rgba(191,90,54,0.14), rgba(92,59,35,0.08))",
        }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${result.title} のカバー画像`}
            className="w-full h-full object-cover block"
          />
        ) : (
          <div className="w-full h-full grid place-items-center p-1.5 text-muted-foreground text-[0.62rem] text-center leading-[1.3]">
            No Cover
          </div>
        )}
      </div>
      <div className="grid gap-1 min-w-0">
        <span className="font-bold">{result.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-[0.88rem]">
          <span className="inline-flex items-center gap-1">
            <img
              src={workTypeIconUrls.game}
              alt=""
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            {"ゲーム"}
          </span>
          {result.releaseDate ? (
            <span className="text-[0.8rem] leading-none text-muted-foreground/80">
              {result.releaseDate.slice(0, 4)}年
            </span>
          ) : null}
        </span>
        {result.platforms.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {result.platforms.map((platform) => (
              <GamePlatformBadge key={platform} platform={platform} />
            ))}
          </span>
        ) : null}
        {result.summary?.trim() ? (
          <span className="text-[0.88rem] text-muted-foreground [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [display:-webkit-box] overflow-hidden">
            {result.summary}
          </span>
        ) : null}
      </div>
    </>
  );

  const contentClass =
    "grid grid-cols-[56px_minmax(0,1fr)] gap-3 items-start w-full px-4 py-3.5 text-left";

  if (footer && footerLayout === "inline") {
    return (
      <div
        className={`overflow-hidden border rounded-2xl bg-[#353535] text-foreground${getCardBorderClass(isSelected)}`}
      >
        {onSelect ? (
          <button className={`${contentClass} cursor-pointer`} type="button" onClick={onSelect}>
            {cardContent}
          </button>
        ) : (
          <div className={contentClass}>{cardContent}</div>
        )}
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
    <div className="relative">
      {onSelect ? (
        <button
          className={`${contentClass} border rounded-2xl bg-[#353535] text-foreground cursor-pointer${getCardBorderClass(isSelected)}`}
          type="button"
          onClick={onSelect}
        >
          {cardContent}
        </button>
      ) : (
        <div
          className={`${contentClass} border border-[rgba(92,59,35,0.2)] rounded-2xl bg-[#353535] text-foreground`}
        >
          {cardContent}
        </div>
      )}
      {footer ? (
        <div
          className="mt-2 rounded-2xl border border-[rgba(92,59,35,0.16)] bg-[rgba(255,255,255,0.05)] px-4 py-3"
          data-footer-layout={footerLayout}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}
