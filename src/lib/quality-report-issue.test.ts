import { buildQualityReportIssue } from "./quality-report.ts";

type BuildQualityReportIssueInput = Parameters<typeof buildQualityReportIssue>[0];

function buildIssueInput(
  overrides: Partial<BuildQualityReportIssueInput> = {},
): BuildQualityReportIssueInput {
  return {
    projectKey: "mirukan",
    observedAt: "2026-04-11 10:00 JST",
    sonarBaseUrl: "https://sonarcloud.io",
    branchName: "main",
    projectMeasures: {},
    bugIssues: [],
    vulnerabilityIssues: [],
    quickWinIssues: [],
    longFiles: [],
    complexFiles: [],
    duplicateFiles: [],
    vitestCoverage: null,
    denoCoverage: null,
    ...overrides,
  };
}

describe("buildQualityReportIssue", () => {
  test("issue 本文に summary と候補一覧を含める", () => {
    const result = buildQualityReportIssue(
      buildIssueInput({
        projectMeasures: {
          code_smells: 12,
          sqale_index: 135,
          duplicated_lines_density: 4.2,
          duplicated_blocks: 3,
          cognitive_complexity: 48,
          complexity: 90,
          ncloc: 1500,
        },
        bugIssues: [],
        vulnerabilityIssues: [],
        quickWinIssues: [
          {
            key: "issue-1",
            message:
              "This assertion is unnecessary since it does not change the type of the expression.",
            component: "mirukan:src/lib/example.ts",
            line: 42,
            rule: "typescript:S4325",
            effortMinutes: 1,
          },
          {
            key: "issue-2",
            message:
              "This assertion is unnecessary since it does not change the type of the expression.",
            component: "mirukan:src/lib/example.test.ts",
            line: 18,
            rule: "typescript:S4325",
            effortMinutes: 1,
          },
          {
            key: "issue-3",
            message: "'/opt/clone123/src/lib/example.ts' imported multiple times.",
            component: "mirukan:src/lib/consumer.ts",
            line: 7,
            rule: "typescript:S3863",
            effortMinutes: 1,
          },
        ],
        longFiles: [{ path: "src/lib/example.ts", value: 520, detail: "8 code smells" }],
        complexFiles: [{ path: "src/lib/example.ts", value: 21, detail: "complexity 30" }],
        duplicateFiles: [{ path: "src/lib/example.ts", value: 6.5, detail: "520 lines" }],
        vitestCoverage: {
          lines: 75,
          branches: 70,
          functions: 76,
          lowCoverageFiles: [
            {
              path: "src/lib/example.ts",
              lines: 61,
              branches: 58,
              functions: 74,
            },
          ],
        },
        denoCoverage: {
          lines: 66.7,
          branches: null,
          functions: null,
          lowCoverageFiles: [
            {
              path: "supabase/functions/_shared/gemini.ts",
              lines: 44.5,
              branches: 46.7,
              functions: 75,
            },
          ],
        },
      }),
    );

    expect(result.title).toBe("quality report snapshot (main / 2026-04-11)");
    expect(result.body).toContain("<!-- quality-report:sonarcloud -->");
    expect(result.body).toContain("# Quality report snapshot");
    expect(result.body).toContain("この Issue は定期生成される quality report snapshot です。");
    expect(result.body).toContain("## 進め方");
    expect(result.body).toContain("## 観測情報");
    expect(result.body).toContain("- まず `バグ`、次に `脆弱性`、その次に `すぐ直す` を優先");
    expect(result.body).toContain("- PR では原則 `Closes` を使わず、必要なら `Refs` に留める");
    expect(result.body).toContain(
      "- 大きすぎる変更を 1 PR に詰め込みすぎない\n\n## 観測情報\n\n- 観測日時: 2026-04-11 10:00 JST",
    );
    expect(result.body).not.toContain("workflow:");
    expect(result.body).toContain("maintainability debt: 2 h 15 min");
    expect(result.body).toContain("## バグ (0件)");
    expect(result.body).toContain("## 脆弱性 (0件)");
    expect(result.body).toContain("- 該当なし");
    expect(result.body).toContain(
      "- This assertion is unnecessary since it does not change the type of the expression. - 2件 (最短 1 min)",
    );
    expect(result.body).toContain("  - 例: [src/lib/example.ts:42]");
    expect(result.body).toContain("  - 例: [src/lib/example.test.ts:18]");
    expect(result.body).toContain(
      "- 'src/lib/example.ts' imported multiple times. - 1件 (最短 1 min)",
    );
    expect(result.body).not.toContain("/opt/clone123");
    expect(result.body).toContain("| `src/lib/example.ts` | 6.5% | 520 lines |");
    expect(result.body).toContain(
      "- アプリ本体のテスト (vitest / src): lines 75.0% / branches 70.0% / functions 76.0%",
    );
    expect(result.body).toContain(
      "- Edge Functions のテスト (deno / supabase/functions): lines 66.7%",
    );
    expect(result.body).toContain("#### 低カバレッジファイル (アプリ本体 / vitest)");
    expect(result.body).toContain("| `src/lib/example.ts` | 61.0% | 58.0% | 74.0% |");
    expect(result.body).toContain("#### 低カバレッジファイル (Edge Functions / deno)");
    expect(result.body).toContain(
      "| `supabase/functions/_shared/gemini.ts` | 44.5% | 46.7% | 75.0% |",
    );
  });

  test("カバレッジが null のとき取得不可と表示する", () => {
    const result = buildQualityReportIssue(buildIssueInput());

    expect(result.body).toContain("- アプリ本体のテスト (vitest / src): 取得不可");
    expect(result.body).toContain(
      "- Edge Functions のテスト (deno / supabase/functions): 取得不可",
    );
    expect(result.body).toContain("#### 低カバレッジファイル (アプリ本体 / vitest)\n\n- 取得不可");
    expect(result.body).toContain(
      "#### 低カバレッジファイル (Edge Functions / deno)\n\n- 取得不可",
    );
  });

  test("絶対パスだけを repo 相対に正規化し、相対パスの quick win label は壊さない", () => {
    const result = buildQualityReportIssue(
      buildIssueInput({
        quickWinIssues: [
          {
            key: "issue-1",
            message: "'/tmp/clone123/src/lib/example.ts' imported multiple times.",
            component: "mirukan:src/lib/consumer-a.ts",
            rule: "typescript:S3863",
            effortMinutes: 1,
          },
          {
            key: "issue-2",
            message:
              "'/opt/actions-runner/_work/mirukan/mirukan/src/features/backlog/types.ts' imported multiple times.",
            component: "mirukan:src/lib/consumer-b.ts",
            rule: "typescript:S3863",
            effortMinutes: 1,
          },
          {
            key: "issue-3",
            message: "'src/lib/example.ts' imported multiple times.",
            component: "mirukan:src/lib/consumer-c.ts",
            rule: "typescript:S3863",
            effortMinutes: 1,
          },
          {
            key: "issue-4",
            message: "'supabase/functions/foo.ts' imported multiple times.",
            component: "mirukan:src/lib/consumer-d.ts",
            rule: "typescript:S3863",
            effortMinutes: 1,
          },
        ],
      }),
    );

    expect(result.body).toContain(
      "- 'src/lib/example.ts' imported multiple times. - 2件 (最短 1 min)",
    );
    expect(result.body).toContain(
      "- 'src/features/backlog/types.ts' imported multiple times. - 1件 (最短 1 min)",
    );
    expect(result.body).toContain(
      "- 'supabase/functions/foo.ts' imported multiple times. - 1件 (最短 1 min)",
    );
    expect(result.body).not.toContain("srclib/example.ts");
    expect(result.body).not.toContain("supabasefunctions/foo.ts");
    expect(result.body).not.toContain("/tmp");
    expect(result.body).not.toContain("/opt/actions-runner/_work/mirukan/mirukan");
  });

  test("通常の slash を含むだけのメッセージは変更しない", () => {
    const result = buildQualityReportIssue(
      buildIssueInput({
        quickWinIssues: [
          {
            key: "issue-1",
            message: "See docs/ui.md and keep src/lib/example.ts as-is.",
            component: "mirukan:src/lib/consumer.ts",
            rule: "custom:message",
            effortMinutes: 1,
          },
        ],
      }),
    );

    expect(result.body).toContain(
      "- See docs/ui.md and keep src/lib/example.ts as-is. - 1件 (最短 1 min)",
    );
  });

  test("bugs が存在する場合にセクションと issue リンクを出力する", () => {
    const result = buildQualityReportIssue(
      buildIssueInput({
        bugIssues: [
          {
            key: "bug-1",
            message: "Null pointer dereference.",
            component: "mirukan:src/lib/example.ts",
            line: 10,
            rule: "typescript:S2259",
          },
          {
            key: "bug-2",
            message: "This condition always evaluates to true.",
            component: "mirukan:src/features/backlog/types.ts",
            line: 5,
            rule: "typescript:S2589",
          },
        ],
      }),
    );

    expect(result.body).toContain("## バグ (2件)");
    expect(result.body).toContain("[src/lib/example.ts:10]");
    expect(result.body).toContain("Null pointer dereference.");
    expect(result.body).toContain("[src/features/backlog/types.ts:5]");
    expect(result.body).toContain("## 脆弱性 (0件)");
  });

  test("bugs / vulnerabilities が 0 件の場合も空セクションを出力する", () => {
    const result = buildQualityReportIssue(buildIssueInput());

    expect(result.body).toContain("## バグ (0件)");
    expect(result.body).toContain("## 脆弱性 (0件)");
    expect(result.body).toContain("- 該当なし");
  });
});
