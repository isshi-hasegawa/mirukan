import { render, screen } from "@testing-library/react";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import { setupTestLifecycle } from "../../../test/test-lifecycle.ts";
import { TmdbWorkCard } from "./TmdbWorkCard.tsx";

setupTestLifecycle();

function createResult(overrides: Partial<TmdbSearchResult> = {}): TmdbSearchResult {
  return {
    tmdbId: 100,
    tmdbMediaType: "movie",
    workType: "movie",
    title: "ゴジラ",
    originalTitle: "Godzilla",
    overview: "怪獣が街を襲う。",
    posterPath: null,
    releaseDate: "2024-01-01",
    jpWatchPlatforms: [],
    hasJapaneseRelease: true,
    rottenTomatoesScore: null,
    ...overrides,
  };
}

describe("TmdbWorkCard", () => {
  test("原題は表示しない", () => {
    render(<TmdbWorkCard result={createResult()} />);

    expect(screen.getByText("ゴジラ")).toBeInTheDocument();
    expect(screen.queryByText("Godzilla")).not.toBeInTheDocument();
    expect(screen.getByText("2024年")).toBeInTheDocument();
  });

  test("概要がない場合は説明文を表示しない", () => {
    render(
      <TmdbWorkCard
        result={createResult({
          overview: null,
        })}
      />,
    );

    expect(screen.queryByText("あらすじはまだ取得できていません。")).not.toBeInTheDocument();
  });

  test("Rotten Tomatoes スコアがある場合は年の横にバッジを表示する", () => {
    render(<TmdbWorkCard result={createResult({ rottenTomatoesScore: 93 })} />);

    expect(screen.getByText("2024年")).toBeInTheDocument();
    expect(screen.getByLabelText("Rotten Tomatoes Fresh 93%")).toBeInTheDocument();
  });

  test("メタ情報に中黒を使わない", () => {
    render(<TmdbWorkCard result={createResult()} />);

    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });
});
