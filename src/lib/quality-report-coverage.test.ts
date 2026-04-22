import {
  parseDenoCoverageArtifacts,
  parseDenoCoverageReport,
  parseVitestCoverageSummary,
} from "./quality-report.ts";

describe("coverage parsers", () => {
  test("vitest coverage-summary.json から集計値を読む", () => {
    expect(
      parseVitestCoverageSummary(
        JSON.stringify({
          total: {
            lines: { pct: 75 },
            branches: { pct: 70 },
            functions: { pct: 76 },
          },
          "src/lib/low.ts": {
            lines: { pct: 62.5 },
            branches: { pct: 40 },
            functions: { pct: 50 },
          },
          "src/lib/high.ts": {
            lines: { pct: 92 },
            branches: { pct: 85 },
            functions: { pct: 88 },
          },
        }),
      ),
    ).toEqual({
      lines: 75,
      branches: 70,
      functions: 76,
      lowCoverageFiles: [
        {
          path: "src/lib/low.ts",
          lines: 62.5,
          branches: 40,
          functions: 50,
        },
      ],
    });
  });

  test("vitest coverage summary が壊れていたら null を返す", () => {
    expect(parseVitestCoverageSummary("{")).toBeNull();
    expect(parseVitestCoverageSummary(JSON.stringify({ total: {} }))).toBeNull();
  });

  test("deno coverage の lcov から集計値と低カバレッジファイルを読む", () => {
    expect(
      parseDenoCoverageReport(`
TN:
SF:file:///workspace/supabase/functions/_shared/gemini.ts
FNF:4
FNH:3
BRF:15
BRH:7
LF:110
LH:49
end_of_record
SF:file:///workspace/supabase/functions/_shared/tmdb.ts
FNF:13
FNH:12
BRF:43
BRH:28
LF:330
LH:238
end_of_record
`),
    ).toEqual({
      lines: 65.22727272727272,
      branches: 60.3448275862069,
      functions: 88.23529411764706,
      lowCoverageFiles: [
        {
          path: "/workspace/supabase/functions/_shared/gemini.ts",
          lines: 44.54545454545455,
          branches: 46.666666666666664,
          functions: 75,
        },
        {
          path: "/workspace/supabase/functions/_shared/tmdb.ts",
          lines: 72.12121212121212,
          branches: 65.11627906976744,
          functions: 92.3076923076923,
        },
      ],
    });
  });

  test("deno coverage の旧 summary 行も fallback で読める", () => {
    expect(parseDenoCoverageReport("cover 66.7% (20/30)")).toEqual({
      lines: 66.7,
      branches: null,
      functions: null,
      lowCoverageFiles: [],
    });
  });

  test("deno coverage artifacts は lcov が壊れていたら summary に fallback する", () => {
    expect(
      parseDenoCoverageArtifacts({
        lcovReport: "not a valid lcov",
        summaryReport: "cover 66.7% (20/30)",
      }),
    ).toEqual({
      lines: 66.7,
      branches: null,
      functions: null,
      lowCoverageFiles: [],
    });
  });

  test("deno coverage の summary 行がなければ null を返す", () => {
    expect(parseDenoCoverageReport("no summary")).toBeNull();
  });
});
