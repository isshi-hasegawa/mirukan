export type TmdbWatchPlatform = {
  key: string;
  logoPath: string | null;
};

export type TmdbSearchResult = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  workType: "movie" | "series";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  jpWatchPlatforms: TmdbWatchPlatform[];
  hasJapaneseRelease: boolean;
  rottenTomatoesScore?: number | null;
};

export type TmdbSeasonSelectionTarget = {
  tmdbId: number;
  tmdbMediaType: "tv";
  workType: "season";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  seasonNumber: number;
  episodeCount: number | null;
  seriesTitle: string;
};

export type TmdbSeasonOption = {
  seasonNumber: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  episodeCount: number | null;
};

export type TmdbSelectionTarget = TmdbSearchResult | TmdbSeasonSelectionTarget;

export type TmdbWorkDetails = {
  tmdbId: number;
  tmdbMediaType: "movie" | "tv";
  workType: "movie" | "series" | "season";
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  releaseDate: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  typicalEpisodeRuntimeMinutes: number | null;
  episodeCount: number | null;
  seasonCount: number | null;
  seasonNumber: number | null;
  imdbId?: string | null;
};

function firstNonBlank(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function isGenericSeasonLabel(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    /^season\s*\d+$/i.test(value.trim()) ||
    /^シーズン\s*\d+$/.test(value.trim()) ||
    normalized === "season" ||
    normalized === "シーズン"
  );
}

export function resolveSeasonTitle(
  seriesTitle: string,
  seasonNumber: number,
  ...candidates: Array<string | null | undefined>
) {
  const fallback = `${seriesTitle} シーズン${seasonNumber}`;
  const chosen = firstNonBlank(...candidates);

  if (!chosen || isGenericSeasonLabel(chosen)) {
    return fallback;
  }

  if (chosen.toLowerCase().includes(seriesTitle.toLowerCase())) {
    return chosen;
  }

  return `${seriesTitle} ${chosen}`;
}
