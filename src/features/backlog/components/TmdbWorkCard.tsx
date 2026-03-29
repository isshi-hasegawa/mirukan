import { FilmIcon, TvIcon } from "@heroicons/react/24/outline";
import { siThemoviedatabase } from "simple-icons";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { platformLabels } from "../constants.ts";

type Props = {
  result: TmdbSearchResult;
  isSelected?: boolean;
  onSelect?: () => void;
  onAddToStacked?: () => void;
};

export function TmdbWorkCard({ result, isSelected, onSelect, onAddToStacked }: Props) {
  const posterUrl = result.posterPath
    ? `https://image.tmdb.org/t/p/w185${result.posterPath}`
    : null;

  const cardContent = (
    <>
      <span className="search-result-thumb">
        {posterUrl ? (
          <img src={posterUrl} alt={`${result.title} のポスター`} />
        ) : (
          <span className="search-result-thumb-fallback">No Poster</span>
        )}
      </span>
      <span className="search-result-content">
        <span className="search-result-title">{result.title}</span>
        <span className="search-result-meta">
          {result.workType === "movie" ? (
            <FilmIcon className="work-type-icon" aria-hidden="true" />
          ) : (
            <TvIcon className="work-type-icon" aria-hidden="true" />
          )}
          {result.workType === "movie" ? "映画" : "シリーズ"}
          {result.releaseDate && ` · ${result.releaseDate.slice(0, 4)}`}
        </span>
        {result.jpWatchPlatforms.length > 0 && (
          <span className="search-result-platforms">
            {result.jpWatchPlatforms.map(({ key, logoPath }) => {
              const label = platformLabels[key as keyof typeof platformLabels];
              if (!label) return null;
              return logoPath ? (
                <img
                  key={key}
                  src={`https://image.tmdb.org/t/p/w45${logoPath}`}
                  alt={label}
                  title={label}
                  className="search-result-platform-logo"
                />
              ) : (
                <span key={key} className="search-result-platform-badge">
                  {label}
                </span>
              );
            })}
          </span>
        )}
        {result.overview && <span className="search-result-overview">{result.overview}</span>}
      </span>
    </>
  );

  const tmdbHref = `https://www.themoviedb.org/${result.tmdbMediaType}/${result.tmdbId}`;

  const tmdbLink = (
    <a
      href={tmdbHref}
      target="_blank"
      rel="noopener noreferrer"
      className="tmdb-work-card-link"
      aria-label="TMDbで作品を開く"
      title="TMDbで作品を開く"
      onClick={(e) => e.stopPropagation()}
    >
      <svg
        className="tmdb-icon"
        viewBox="0 0 24 24"
        dangerouslySetInnerHTML={{ __html: siThemoviedatabase.svg }}
        aria-hidden="true"
      />
    </a>
  );

  return (
    <>
      {onSelect ? (
        <div className="tmdb-work-card-wrap">
          <button
            className={`search-result-button${isSelected ? " is-selected" : ""}`}
            type="button"
            onClick={onSelect}
          >
            {cardContent}
          </button>
          {tmdbLink}
        </div>
      ) : (
        <div className="tmdb-work-card-wrap">
          <div className="search-result-button recommend-item-info-card">{cardContent}</div>
          {tmdbLink}
        </div>
      )}
      {onAddToStacked && (
        <button
          type="button"
          className="recommend-item-action recommend-item-action-stack"
          onClick={onAddToStacked}
        >
          ストックに追加
        </button>
      )}
    </>
  );
}
