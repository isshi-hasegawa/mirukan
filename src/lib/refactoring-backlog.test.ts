import {
  buildRefactoringBacklogIssue,
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
          message: "Extract duplicated branch",
          component: "mirukan:src/lib/example.ts",
          line: 42,
          effortMinutes: 15,
        },
      ],
      longFiles: [{ path: "src/lib/example.ts", value: 520, detail: "8 code smells" }],
      complexFiles: [{ path: "src/lib/example.ts", value: 21, detail: "complexity 30" }],
      duplicateFiles: [{ path: "src/lib/example.ts", value: 6.5, detail: "520 lines" }],
    });

    expect(result.title).toBe("refactoring backlog");
    expect(result.body).toContain("<!-- refactoring-backlog:sonarcloud -->");
    expect(result.body).toContain("maintainability debt: 2 h 15 min");
    expect(result.body).toContain("Extract duplicated branch");
    expect(result.body).toContain("| `src/lib/example.ts` | 6.5% | 520 lines |");
  });
});
