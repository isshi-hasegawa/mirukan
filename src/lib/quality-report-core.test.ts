import { normalizeComponentPath, parseMeasureValue, parseMinutes } from "./quality-report.ts";

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
