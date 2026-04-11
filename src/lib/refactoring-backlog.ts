import { matchesAnyPattern } from "./refactoring-backlog-paths.ts";
import {
  formatMinutes,
  formatNumber,
  formatPercent,
  renderIssueList,
  renderQuickWinIssues,
  renderRankedSignals,
} from "./refactoring-backlog-render.ts";

const REFACTORING_BACKLOG_MARKER = "<!-- refactoring-backlog:sonarcloud -->";
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

type RankedSignal = {
  path: string;
  value: number;
  detail: string;
};

type RefactoringBacklogInput = {
  projectKey: string;
  observedAt: string;
  sonarBaseUrl: string;
  branchName: string;
  workflowUrl: string;
  projectMeasures: SonarMeasureMap;
  bugIssues: SonarIssue[];
  vulnerabilityIssues: SonarIssue[];
  quickWinIssues: SonarIssue[];
  longFiles: RankedSignal[];
  complexFiles: RankedSignal[];
  duplicateFiles: RankedSignal[];
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

const MINUTES_PER_UNIT = {
  d: 60 * 8,
  h: 60,
  min: 1,
} as const;

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

export function buildRefactoringBacklogIssue({
  projectKey,
  observedAt,
  sonarBaseUrl,
  branchName,
  workflowUrl,
  projectMeasures,
  bugIssues,
  vulnerabilityIssues,
  quickWinIssues,
  longFiles,
  complexFiles,
  duplicateFiles,
}: RefactoringBacklogInput) {
  const base = trimTrailingSlash(sonarBaseUrl);
  const encodedKey = encodeURIComponent(projectKey);
  const overallDashboardUrl = `${base}/summary/overall?id=${encodedKey}&branch=${encodeURIComponent(branchName)}`;
  const issueTitle = "refactoring backlog";
  const issueBody = [
    REFACTORING_BACKLOG_MARKER,
    "",
    "# Refactoring backlog",
    "",
    `- 観測日時: ${observedAt}`,
    `- 対象ブランチ: \`${branchName}\``,
    `- SonarCloud: [overall dashboard](${overallDashboardUrl})`,
    `- workflow: [refactoring-backlog.yml](${workflowUrl})`,
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
    ...(bugIssues.length > 0
      ? [
          `## バグ (${bugIssues.length}件)`,
          "",
          ...renderIssueList(projectKey, sonarBaseUrl, bugIssues),
          "",
        ]
      : []),
    ...(vulnerabilityIssues.length > 0
      ? [
          `## 脆弱性 (${vulnerabilityIssues.length}件)`,
          "",
          ...renderIssueList(projectKey, sonarBaseUrl, vulnerabilityIssues),
          "",
        ]
      : []),
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

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
