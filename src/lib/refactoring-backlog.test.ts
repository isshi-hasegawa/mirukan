import {
  buildRefactoringBacklogIssue,
  filterBacklogIssues,
  filterBacklogSignals,
  normalizeComponentPath,
  parseMeasureValue,
  parseMinutes,
  rankComplexFiles,
  rankDuplicateFiles,
  rankLongFiles,
  selectQuickWinIssues,
} from "./refactoring-backlog.ts";

describe("parseMeasureValue", () => {
  test("数値文字列を number に変換する", () => {
    expect(parseMeasureValue("12.5")).toBe(12.5);
  });

  test("空値は null を返す", () => {
    expect(parseMeasureValue("")).toBeNull();
    expect(parseMeasureValue(undefined)).toBeNull();
  });
});

describe("parseMinutes", () => {
  test("SonarCloud effort 文字列から分を抽出する", () => {
    expect(parseMinutes("30min")).toBe(30);
    expect(parseMinutes("1h 30min")).toBe(90);
    expect(parseMinutes("2d 1h")).toBe(1020);
  });

  test("数値がなければ undefined を返す", () => {
    expect(parseMinutes("unknown")).toBeUndefined();
  });

  test("7 桁超の digit run を途中から誤マッチしない", () => {
    // \b がないと "1234567h" が "234567h" としてマッチし、
    // 234567 時間という過小値に誤解釈される。
    expect(parseMinutes("1234567h")).toBeUndefined();
    expect(parseMinutes("1234567min")).toBeUndefined();
    // 6 桁以内は正常にマッチする
    expect(parseMinutes("123456h")).toBe(123456 * 60);
  });

  test("長大な非マッチ入力でも super-linear にならず短時間で完了する", () => {
    // ReDoS 回帰テスト: 量化子が上限付きで固定コストのため、
    // 桁数を増やしても線形時間で完了すること。
    const pathological = `${"9".repeat(100000)}x`;
    const start = Date.now();
    expect(parseMinutes(pathological)).toBeUndefined();
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe("normalizeComponentPath", () => {
  test("project key prefix を除去する", () => {
    expect(normalizeComponentPath("mirukan:src/lib/example.ts", "mirukan")).toBe(
      "src/lib/example.ts",
    );
  });
});

describe("signal ranking", () => {
  const files = [
    {
      path: "src/a.ts",
      measures: {
        ncloc: 120,
        code_smells: 2,
        cognitive_complexity: 10,
        complexity: 14,
        duplicated_lines_density: 1.2,
      },
    },
    {
      path: "src/b.ts",
      measures: {
        ncloc: 520,
        code_smells: 8,
        cognitive_complexity: 18,
        complexity: 30,
        duplicated_lines_density: 6.5,
      },
    },
    {
      path: "src/c.ts",
      measures: {
        ncloc: 410,
        code_smells: 5,
        cognitive_complexity: 22,
        complexity: 28,
        duplicated_lines_density: 3.4,
      },
    },
  ];

  test("長大ファイルを ncloc で抽出する", () => {
    expect(rankLongFiles(files)).toEqual([
      { path: "src/b.ts", value: 520, detail: "8 code smells" },
      { path: "src/c.ts", value: 410, detail: "5 code smells" },
    ]);
  });

  test("高複雑度ファイルを cognitive complexity で抽出する", () => {
    expect(rankComplexFiles(files)).toEqual([
      { path: "src/c.ts", value: 22, detail: "complexity 28" },
      { path: "src/b.ts", value: 18, detail: "complexity 30" },
    ]);
  });

  test("高重複率ファイルを duplicated lines density で抽出する", () => {
    expect(rankDuplicateFiles(files)).toEqual([
      { path: "src/b.ts", value: 6.5, detail: "520 lines" },
      { path: "src/c.ts", value: 3.4, detail: "410 lines" },
    ]);
  });

  test("backlog 出力時だけ除外パターンに一致するファイルを落とす", () => {
    expect(
      filterBacklogSignals([
        ...files,
        {
          path: "pnpm-lock.yaml",
          measures: { ncloc: 999 },
        },
        {
          path: "supabase/templates/confirmation.html",
          measures: { duplicated_lines_density: 88 },
        },
        {
          path: "supabase/migrations/20260412000000_create_items.sql",
          measures: { ncloc: 500 },
        },
        {
          path: "supabase/seed.sample.sql",
          measures: { ncloc: 500 },
        },
      ]),
    ).toEqual(files);
  });

  test("seed.sql は backlog 保守対象として残す", () => {
    expect(
      filterBacklogSignals([
        ...files,
        {
          path: "supabase/seed.sql",
          measures: { ncloc: 500 },
        },
      ]),
    ).toEqual([
      ...files,
      {
        path: "supabase/seed.sql",
        measures: { ncloc: 500 },
      },
    ]);
  });
});

describe("selectQuickWinIssues", () => {
  test("effort の小さい順に候補を選ぶ", () => {
    const issues = [
      { key: "1", message: "A", component: "mirukan:src/a.ts", effortMinutes: 45 },
      { key: "2", message: "B", component: "mirukan:src/b.ts", effortMinutes: 10 },
      { key: "3", message: "C", component: "mirukan:src/c.ts" },
    ];

    expect(selectQuickWinIssues(issues)).toEqual([
      { key: "2", message: "B", component: "mirukan:src/b.ts", effortMinutes: 10 },
      { key: "1", message: "A", component: "mirukan:src/a.ts", effortMinutes: 45 },
      { key: "3", message: "C", component: "mirukan:src/c.ts" },
    ]);
  });

  test("limit 境界と同じ effort の issue は集約用に残す", () => {
    const issues = [
      { key: "1", message: "A", component: "mirukan:src/a.ts", effortMinutes: 1 },
      { key: "2", message: "A", component: "mirukan:src/b.ts", effortMinutes: 1 },
      { key: "3", message: "B", component: "mirukan:src/c.ts", effortMinutes: 1 },
      { key: "4", message: "C", component: "mirukan:src/d.ts", effortMinutes: 5 },
    ];

    expect(selectQuickWinIssues(issues, 2)).toEqual([
      { key: "1", message: "A", component: "mirukan:src/a.ts", effortMinutes: 1 },
      { key: "2", message: "A", component: "mirukan:src/b.ts", effortMinutes: 1 },
      { key: "3", message: "B", component: "mirukan:src/c.ts", effortMinutes: 1 },
    ]);
  });

  test("migration 配下の issue は backlog 候補から外す", () => {
    const issues = [
      {
        key: "1",
        message: "A",
        component: "mirukan:supabase/migrations/20260412000000_create_items.sql",
        effortMinutes: 1,
      },
      {
        key: "2",
        message: "B",
        component: "mirukan:supabase/seed.sql",
        effortMinutes: 1,
      },
      {
        key: "3",
        message: "C",
        component: "mirukan:supabase/seed.sample.sql",
        effortMinutes: 1,
      },
      {
        key: "4",
        message: "C",
        component: "mirukan:src/lib/example.ts",
        effortMinutes: 1,
      },
    ];

    expect(filterBacklogIssues(issues, "mirukan")).toEqual([
      {
        key: "2",
        message: "B",
        component: "mirukan:supabase/seed.sql",
        effortMinutes: 1,
      },
      {
        key: "4",
        message: "C",
        component: "mirukan:src/lib/example.ts",
        effortMinutes: 1,
      },
    ]);
  });
});

describe("buildRefactoringBacklogIssue", () => {
  test("issue 本文に summary と候補一覧を含める", () => {
    const result = buildRefactoringBacklogIssue({
      projectKey: "mirukan",
      observedAt: "2026-04-11 10:00 UTC",
      sonarBaseUrl: "https://sonarcloud.io",
      branchName: "main",
      projectMeasures: {
        code_smells: 12,
        sqale_index: 135,
        duplicated_lines_density: 4.2,
        duplicated_blocks: 3,
        cognitive_complexity: 48,
        complexity: 90,
        ncloc: 1500,
      },
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
    });

    expect(result.title).toBe("refactoring backlog");
    expect(result.body).toContain("<!-- refactoring-backlog:sonarcloud -->");
    expect(result.body).toContain("maintainability debt: 2 h 15 min");
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
  });

  test("絶対パスだけを repo 相対に正規化し、相対パスの quick win label は壊さない", () => {
    const result = buildRefactoringBacklogIssue({
      projectKey: "mirukan",
      observedAt: "2026-04-11 10:00 UTC",
      sonarBaseUrl: "https://sonarcloud.io",
      branchName: "main",
      projectMeasures: {},
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
      longFiles: [],
      complexFiles: [],
      duplicateFiles: [],
    });

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
    const result = buildRefactoringBacklogIssue({
      projectKey: "mirukan",
      observedAt: "2026-04-11 10:00 UTC",
      sonarBaseUrl: "https://sonarcloud.io",
      branchName: "main",
      projectMeasures: {},
      quickWinIssues: [
        {
          key: "issue-1",
          message: "See docs/ui.md and keep src/lib/example.ts as-is.",
          component: "mirukan:src/lib/consumer.ts",
          rule: "custom:message",
          effortMinutes: 1,
        },
      ],
      longFiles: [],
      complexFiles: [],
      duplicateFiles: [],
    });

    expect(result.body).toContain(
      "- See docs/ui.md and keep src/lib/example.ts as-is. - 1件 (最短 1 min)",
    );
  });
});
