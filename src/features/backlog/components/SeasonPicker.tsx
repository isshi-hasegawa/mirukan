import { CheckIcon } from "@heroicons/react/24/outline";
import type { TmdbSeasonOption } from "../../../lib/tmdb.ts";

type Props = {
  seasonOptions: TmdbSeasonOption[];
  selectedSeasonNumbers: number[];
  isLoadingSeasons: boolean;
  hasAllSeasonsSelected: boolean;
  selectedSeasonSummary: string;
  onToggleSeason: (seasonNumber: number) => void;
  onToggleAll: () => void;
};

const seasonBtnClass = (active: boolean) =>
  `inline-flex items-center gap-2 px-3.5 py-2.5 border rounded-full text-[0.88rem] cursor-pointer transition-[background,color,border-color,box-shadow] duration-150${
    active
      ? " border-[rgba(191,90,54,0.45)] shadow-[inset_0_0_0_1px_rgba(191,90,54,0.2)] bg-[rgba(191,90,54,0.08)] text-foreground"
      : " border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.06)] text-foreground hover:bg-[rgba(255,255,255,0.1)]"
  }`;

function SeasonCheckbox({ active }: { active: boolean }) {
  return (
    <span
      className={`grid w-4 h-4 place-items-center rounded-full border ${
        active
          ? "border-[rgb(191,90,54)] bg-[rgb(191,90,54)] text-white"
          : "border-[rgba(255,255,255,0.3)] text-transparent"
      }`}
    >
      <CheckIcon className="w-3 h-3" aria-hidden="true" />
    </span>
  );
}

export function SeasonPicker({
  seasonOptions,
  selectedSeasonNumbers,
  isLoadingSeasons,
  hasAllSeasonsSelected,
  selectedSeasonSummary,
  onToggleSeason,
  onToggleAll,
}: Props) {
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.88rem] text-muted-foreground">{selectedSeasonSummary}</p>
        {seasonOptions.length > 0 && (
          <button
            className="text-[0.82rem] text-muted-foreground transition-colors hover:text-foreground"
            type="button"
            aria-pressed={hasAllSeasonsSelected}
            onClick={(event) => {
              event.stopPropagation();
              onToggleAll();
            }}
          >
            {hasAllSeasonsSelected ? "すべて解除" : "すべて選択"}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className={seasonBtnClass(selectedSeasonNumbers.includes(1))}
          type="button"
          aria-pressed={selectedSeasonNumbers.includes(1)}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSeason(1);
          }}
        >
          <SeasonCheckbox active={selectedSeasonNumbers.includes(1)} />
          <span>シーズン1</span>
        </button>
        {seasonOptions.length > 0
          ? seasonOptions.map((season) => (
              <button
                key={season.seasonNumber}
                className={seasonBtnClass(selectedSeasonNumbers.includes(season.seasonNumber))}
                type="button"
                aria-pressed={selectedSeasonNumbers.includes(season.seasonNumber)}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSeason(season.seasonNumber);
                }}
              >
                <SeasonCheckbox active={selectedSeasonNumbers.includes(season.seasonNumber)} />
                <span>シーズン{season.seasonNumber}</span>
                {season.episodeCount && (
                  <span className="text-muted-foreground text-[0.8rem]">
                    {season.episodeCount}話
                  </span>
                )}
              </button>
            ))
          : isLoadingSeasons && (
              <p className="text-muted-foreground text-[0.88rem]">
                シーズン一覧を読み込んでいます...
              </p>
            )}
      </div>
    </div>
  );
}
