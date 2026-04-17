import { matchesAnyPattern } from "./quality-report-paths.ts";
import {
  formatMinutes,
  formatNumber,
  formatPercent,
  renderCoverageFiles,
  renderIssueList,
  renderQuickWinIssues,
  renderRankedSignals,
} from "./quality-report-render.ts";

const QUALITY_REPORT_MARKER = "<!-- quality-report:sonarcloud -->";
const DEFAULT_BACKLOG_EXCLUDE_PATTERNS = [
  "pnpm-lock.yaml",
  "supabase/migrations/**",
  "supabase/*.sample.sql",
  "supabase/templates/**",
] as const;

export type SonarMeasureKey =
  | "code_smells"
  | "sqale_index"
  | "duplicated_lines_density"
  | "duplicated_blocks"
  | "complexity"
  | "cognitive_complexity"
  | "ncloc";

export type SonarMeasureMap = Partial<Record<SonarMeasureKey, number>>;

export type SonarIssue = {
  key: string;
  message: string;
  component: string;
  line?: number;
  rule?: string;
  effortMinutes?: number;
};

export type SonarFileSignal = {
  path: string;
  measures: SonarMeasureMap;
};

type TestCoverage = {
  lines: number;
  branches?: number | null;
  functions?: number | null;
  lowCoverageFiles: CoverageFile[];
};

type CoverageFile = {
  path: string;
  lines: number;
  branches?: number | null;
  functions?: number | null;
};

type RankedSignal = {
  path: string;
  value: number;
  detail: string;
};

type QualityReportInput = {
  projectKey: string;
  observedAt: string;
  sonarBaseUrl: string;
  branchName: string;
  projectMeasures: SonarMeasureMap;
  bugIssues: SonarIssue[];
  vulnerabilityIssues: SonarIssue[];
  quickWinIssues: SonarIssue[];
  longFiles: RankedSignal[];
  complexFiles: RankedSignal[];
  duplicateFiles: RankedSignal[];
  vitestCoverage: TestCoverage | null;
  denoCoverage: TestCoverage | null;
};

export function parseMeasureValue(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseVitestCoverageSummary(value: string): TestCoverage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  const total = getRecordValue(parsed, "total");
  if (!total) {
    return null;
  }

  const lines = getCoverageMetricPct(total, "lines");
  if (lines == null) {
    return null;
  }

  return {
    lines,
    branches: getCoverageMetricPct(total, "branches"),
    functions: getCoverageMetricPct(total, "functions"),
    lowCoverageFiles: rankLowCoverageFiles(
      Object.entries(parsed)
        .filter(([path]) => path !== "total")
        .flatMap(([path, metrics]) => {
          const coverageFile = parseCoverageFile(path, metrics);
          return coverageFile ? [coverageFile] : [];
        }),
    ),
  };
}

export function parseDenoCoverageReport(value: string): TestCoverage | null {
  const lcovCoverage = parseLcovCoverageReport(value);
  if (lcovCoverage) {
    return lcovCoverage;
  }

  const coverMatch = /\bcover\s+(\d+(?:\.\d+)?)%\s+\(\d+\/\d+\)/i.exec(value);
  if (!coverMatch) {
    return null;
  }

  return {
    lines: Number(coverMatch[1]),
    branches: null,
    functions: null,
    lowCoverageFiles: [],
  };
}

const MINUTES_PER_UNIT = {
  d: 60 * 8,
  h: 60,
  min: 1,
} as const;
const LOW_COVERAGE_THRESHOLD = 80;
const LOW_COVERAGE_LIMIT = 5;

type EffortUnit = keyof typeof MINUTES_PER_UNIT;

// \b で単語境界にアンカーし、長い digit run の途中にマッチしないようにする
// (例: "1234567h" が "234567h" として誤解釈されるのを防ぐ)。
// 量化子は明示的に上限を付けて super-linear backtracking も防ぐ。
// SonarCloud の effort 文字列 (例: "2d 1h 30min") は小さい整数と最小限の空白で
// 表現されるため、6 桁 / 4 空白で十分な余白がある。
const EFFORT_TOKEN_PATTERN = /\b(\d{1,6})\s{0,4}(min|h|d)/g;

export function parseMinutes(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  let totalMinutes = 0;
  for (const match of value.matchAll(EFFORT_TOKEN_PATTERN)) {
    const amount = Number(match[1]);
    const unit = match[2] as EffortUnit;
    if (amount > 0) {
      totalMinutes += amount * MINUTES_PER_UNIT[unit];
    }
  }

  return totalMinutes > 0 ? totalMinutes : undefined;
}

export function normalizeComponentPath(component: string, projectKey: string): string {
  const prefix = `${projectKey}:`;
  return component.startsWith(prefix) ? component.slice(prefix.length) : component;
}

export function filterBacklogSignals(
  files: SonarFileSignal[],
  excludePatterns: readonly string[] = DEFAULT_BACKLOG_EXCLUDE_PATTERNS,
) {
  return files.filter((file) => !matchesAnyPattern(file.path, excludePatterns));
}

export function filterBacklogIssues(
  issues: SonarIssue[],
  projectKey: string,
  excludePatterns: readonly string[] = DEFAULT_BACKLOG_EXCLUDE_PATTERNS,
) {
  return issues.filter(
    (issue) =>
      !matchesAnyPattern(normalizeComponentPath(issue.component, projectKey), excludePatterns),
  );
}

export function rankLongFiles(files: SonarFileSignal[], limit = 5): RankedSignal[] {
  return files
    .map((file) => ({
      path: file.path,
      value: file.measures.ncloc ?? 0,
      detail: `${formatNumber(file.measures.code_smells)} code smells`,
    }))
    .filter((file) => file.value >= 300)
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
}

export function rankComplexFiles(files: SonarFileSignal[], limit = 5): RankedSignal[] {
  return files
    .map((file) => {
      const cognitiveComplexity = file.measures.cognitive_complexity ?? 0;
      const complexity = file.measures.complexity ?? 0;
      return {
        path: file.path,
        value: cognitiveComplexity,
        detail: `complexity ${formatNumber(complexity)}`,
      };
    })
    .filter((file) => file.value >= 15)
    .sort((left, right) => right.value - left.value || left.path.localeCompare(right.path))
    .slice(0, limit);
}

export function rankDuplicateFiles(files: SonarFileSignal[], limit = 5): RankedSignal[] {
  return files
    .map((file) => ({
      path: file.path,
      value: file.measures.duplicated_lines_density ?? 0,
      detail: `${formatNumber(file.measures.ncloc)} lines`,
    }))
    .filter((file) => file.value >= 3)
    .sort((left, right) => right.value - left.value || left.path.localeCompare(right.path))
    .slice(0, limit);
}

export function selectQuickWinIssues(issues: SonarIssue[], limit = 7): SonarIssue[] {
  const sorted = [...issues].sort(compareQuickWinIssues);

  if (sorted.length <= limit) {
    return sorted;
  }

  const cutoffEffort = sorted[limit - 1]?.effortMinutes;
  if (cutoffEffort == null) {
    return sorted.slice(0, limit);
  }

  return sorted.filter((issue) => effortOrInfinity(issue.effortMinutes) <= cutoffEffort);
}

function compareQuickWinIssues(left: SonarIssue, right: SonarIssue) {
  return (
    effortOrInfinity(left.effortMinutes) - effortOrInfinity(right.effortMinutes) ||
    left.component.localeCompare(right.component)
  );
}

function effortOrInfinity(value: number | undefined) {
  return value ?? Number.POSITIVE_INFINITY;
}

export function buildQualityReportIssue({
  projectKey,
  observedAt,
  sonarBaseUrl,
  branchName,
  projectMeasures,
  bugIssues,
  vulnerabilityIssues,
  quickWinIssues,
  longFiles,
  complexFiles,
  duplicateFiles,
  vitestCoverage,
  denoCoverage,
}: QualityReportInput) {
  const base = trimTrailingSlash(sonarBaseUrl);
  const encodedKey = encodeURIComponent(projectKey);
  const overallDashboardUrl = `${base}/summary/overall?id=${encodedKey}&branch=${encodeURIComponent(branchName)}`;
  const issueTitle = buildQualityReportTitle({ observedAt, branchName });
  const issueBody = [
    QUALITY_REPORT_MARKER,
    "",
    "# Quality report snapshot",
    "",
    "この Issue は定期生成される quality report snapshot です。最新の観測結果をもとに、今回対応する項目を自分で選んで進めてください。",
    "",
    "## 進め方",
    "",
    "- まず `バグ`、次に `脆弱性`、その次に `すぐ直す` を優先",
    "- 余力があれば `構造改善が必要` から安全に触れられるものを追加",
    "- 振る舞いを変えないリファクタを優先",
    "- 実行手順・検証・コミット・PR の進め方は `AGENTS.md` と各 skill に従う",
    "- PR / 最終報告では、対応した項目・見送った項目・実施した検証を整理する",
    "- PR では原則 `Closes` を使わず、必要なら `Refs` に留める",
    "- 大きすぎる変更を 1 PR に詰め込みすぎない",
    "",
    "## 観測情報",
    "",
    `- 観測日時: ${observedAt}`,
    `- 対象ブランチ: \`${branchName}\``,
    `- SonarCloud: [overall dashboard](${overallDashboardUrl})`,
    "",
    "## 今回のサマリー",
    "",
    `- code smells: ${formatNumber(projectMeasures.code_smells)}`,
    `- maintainability debt: ${formatMinutes(projectMeasures.sqale_index)}`,
    `- duplicated lines density: ${formatPercent(projectMeasures.duplicated_lines_density)}`,
    `- duplicated blocks: ${formatNumber(projectMeasures.duplicated_blocks)}`,
    `- cognitive complexity: ${formatNumber(projectMeasures.cognitive_complexity)}`,
    `- complexity: ${formatNumber(projectMeasures.complexity)}`,
    `- ncloc: ${formatNumber(projectMeasures.ncloc)}`,
    "",
    "### テストカバレッジ",
    "",
    `- アプリ本体のテスト (vitest / src): ${formatCoverage(vitestCoverage)}`,
    `- Edge Functions のテスト (deno / supabase/functions): ${formatCoverage(denoCoverage)}`,
    "",
    "#### 低カバレッジファイル (アプリ本体 / vitest)",
    "",
    ...renderCoverageFileSection(vitestCoverage),
    "",
    "#### 低カバレッジファイル (Edge Functions / deno)",
    "",
    ...renderCoverageFileSection(denoCoverage),
    "",
    `## バグ (${bugIssues.length}件)`,
    "",
    ...renderIssueSection(projectKey, sonarBaseUrl, bugIssues),
    "",
    `## 脆弱性 (${vulnerabilityIssues.length}件)`,
    "",
    ...renderIssueSection(projectKey, sonarBaseUrl, vulnerabilityIssues),
    "",
    "## すぐ直す",
    "",
    ...renderQuickWinIssues(projectKey, sonarBaseUrl, quickWinIssues),
    "",
    "## 構造改善が必要",
    "",
    "### 長大ファイル",
    "",
    ...renderRankedSignals(longFiles, "ncloc", "関連メモ"),
    "",
    "### 複雑度が高いファイル",
    "",
    ...renderRankedSignals(complexFiles, "cognitive complexity", "関連メモ"),
    "",
    "### 重複率が高いファイル",
    "",
    ...renderRankedSignals(duplicateFiles, "duplicated lines density", "関連メモ"),
    "",
  ].join("\n");

  return {
    title: issueTitle,
    body: issueBody,
  };
}

function formatCoverage(coverage: TestCoverage | null): string {
  if (!coverage) {
    return "取得不可";
  }

  const metrics = [
    `lines ${coverage.lines.toFixed(1)}%`,
    coverage.branches == null ? null : `branches ${coverage.branches.toFixed(1)}%`,
    coverage.functions == null ? null : `functions ${coverage.functions.toFixed(1)}%`,
  ].filter((metric): metric is string => metric != null);

  return metrics.length > 0 ? metrics.join(" / ") : "取得不可";
}

function renderCoverageFileSection(coverage: TestCoverage | null) {
  if (!coverage) {
    return ["- 取得不可"];
  }

  return renderCoverageFiles(coverage.lowCoverageFiles);
}

function buildQualityReportTitle(input: { observedAt: string; branchName: string }) {
  return `quality report snapshot (${input.branchName} / ${extractObservedDate(input.observedAt)})`;
}

function extractObservedDate(value: string) {
  const matched = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return matched?.[1] ?? value;
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function renderIssueSection(projectKey: string, sonarBaseUrl: string, issues: SonarIssue[]) {
  if (issues.length === 0) {
    return ["- 該当なし"];
  }

  return renderIssueList(projectKey, sonarBaseUrl, issues);
}

function getCoverageMetricPct(
  value: unknown,
  key: "lines" | "branches" | "functions",
): number | null {
  const metric = getRecordValue(value, key);
  if (!metric) {
    return null;
  }

  const pct = getRecordValue(metric, "pct");
  return typeof pct === "number" || typeof pct === "string" ? parseMeasureValue(pct) : null;
}

function getRecordValue(
  value: unknown,
  key: string,
): Record<string, unknown> | number | string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return (value as Record<string, unknown>)[key] as
    | Record<string, unknown>
    | number
    | string
    | null;
}

type CoverageCounts = {
  lineFound: number;
  lineHit: number;
  branchFound?: number | null;
  branchHit?: number | null;
  functionFound?: number | null;
  functionHit?: number | null;
};

function parseCoverageFile(path: string, value: unknown): CoverageFile | null {
  const lines = getCoverageMetricPct(value, "lines");
  if (lines == null) {
    return null;
  }

  return {
    path,
    lines,
    branches: getCoverageMetricPct(value, "branches"),
    functions: getCoverageMetricPct(value, "functions"),
  };
}

function rankLowCoverageFiles(files: CoverageFile[], limit = LOW_COVERAGE_LIMIT) {
  return files
    .filter((file) => getLowestCoverageMetric(file) < LOW_COVERAGE_THRESHOLD)
    .sort(
      (left, right) =>
        getLowestCoverageMetric(left) - getLowestCoverageMetric(right) ||
        left.lines - right.lines ||
        left.path.localeCompare(right.path),
    )
    .map((file) => ({
      path: file.path,
      lines: file.lines,
      branches: file.branches,
      functions: file.functions,
    }))
    .slice(0, limit);
}

function getLowestCoverageMetric(file: CoverageFile) {
  return Math.min(
    file.lines,
    file.branches ?? Number.POSITIVE_INFINITY,
    file.functions ?? Number.POSITIVE_INFINITY,
  );
}

function parseLcovCoverageReport(value: string): TestCoverage | null {
  const files = value.split("end_of_record").flatMap((record) => {
    const coverageFile = parseLcovRecord(record);
    return coverageFile ? [coverageFile] : [];
  });

  if (files.length === 0) {
    return null;
  }

  const aggregate = aggregateCoverageFiles(files);
  if (!aggregate) {
    return null;
  }

  return {
    ...aggregate,
    lowCoverageFiles: rankLowCoverageFiles(files),
  };
}

function parseLcovRecord(value: string): (CoverageFile & CoverageCounts) | null {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  const path = lines.find((line) => line.startsWith("SF:"))?.slice(3);
  if (!path) {
    return null;
  }

  const lineFound = readLcovCount(lines, "LF");
  const lineHit = readLcovCount(lines, "LH");
  if (lineFound == null || lineHit == null || lineFound === 0) {
    return null;
  }

  const functionFound = readLcovCount(lines, "FNF");
  const functionHit = readLcovCount(lines, "FNH");
  const branchFound = readLcovCount(lines, "BRF");
  const branchHit = readLcovCount(lines, "BRH");

  return {
    path: normalizeCoveragePath(path),
    lines: toCoveragePercent(lineHit, lineFound)!,
    branches: toCoveragePercent(branchHit, branchFound),
    functions: toCoveragePercent(functionHit, functionFound),
    lineFound,
    lineHit,
    branchFound,
    branchHit,
    functionFound,
    functionHit,
  };
}

function aggregateCoverageFiles(files: Array<CoverageFile & CoverageCounts>) {
  const lineFound = sumCoverageCount(files, "lineFound");
  const lineHit = sumCoverageCount(files, "lineHit");
  if (lineFound == null || lineHit == null || lineFound === 0) {
    return null;
  }

  const branchFound = sumCoverageCount(files, "branchFound");
  const branchHit = sumCoverageCount(files, "branchHit");
  const functionFound = sumCoverageCount(files, "functionFound");
  const functionHit = sumCoverageCount(files, "functionHit");

  return {
    lines: toCoveragePercent(lineHit, lineFound)!,
    branches: toCoveragePercent(branchHit, branchFound),
    functions: toCoveragePercent(functionHit, functionFound),
  };
}

function readLcovCount(lines: string[], prefix: string) {
  const matched = lines.find((line) => line.startsWith(`${prefix}:`));
  if (!matched) {
    return null;
  }

  return parseMeasureValue(matched.slice(prefix.length + 1));
}

function toCoveragePercent(hit: number | null, found: number | null) {
  if (hit == null || found == null || found === 0) {
    return null;
  }

  return (hit / found) * 100;
}

function normalizeCoveragePath(path: string) {
  if (!path.startsWith("file://")) {
    return path;
  }

  try {
    return decodeURIComponent(new URL(path).pathname);
  } catch {
    return path;
  }
}

function sumCoverageCount(files: Array<CoverageFile & CoverageCounts>, key: keyof CoverageCounts) {
  const values = files
    .map((file) => file[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
}
