import {
  filterBacklogIssues,
  filterBacklogSignals,
  rankComplexFiles,
  rankDuplicateFiles,
  rankLongFiles,
  selectQuickWinIssues,
} from "./quality-report.ts";

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
