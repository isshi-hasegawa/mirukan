export const REFACTORING_BACKLOG_MARKER = "<!-- refactoring-backlog:sonarcloud -->";

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

export type RankedSignal = {
  path: string;
  value: number;
  detail: string;
};

type RefactoringBacklogInput = {
  projectKey: string;
  observedAt: string;
  sonarBaseUrl: string;
  branchName: string;
  projectMeasures: SonarMeasureMap;
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

export function parseMinutes(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const matches = [...value.matchAll(/(\d+)\s*(d|h|min)/g)];
  if (matches.length === 0) {
    return undefined;
  }

  const totalMinutes = matches.reduce((sum, match) => {
    const amount = Number(match[1]);
    const unit = match[2];

    if (!Number.isFinite(amount)) {
      return sum;
    }

    switch (unit) {
      case "d":
        return sum + amount * 60 * 8;
      case "h":
        return sum + amount * 60;
      case "min":
        return sum + amount;
      default:
        return sum;
    }
  }, 0);

  return totalMinutes > 0 ? totalMinutes : undefined;
}

export function normalizeComponentPath(component: string, projectKey: string): string {
  const prefix = `${projectKey}:`;
  return component.startsWith(prefix) ? component.slice(prefix.length) : component;
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
  return [...issues]
    .sort((left, right) => {
      const leftEffort = left.effortMinutes ?? Number.POSITIVE_INFINITY;
      const rightEffort = right.effortMinutes ?? Number.POSITIVE_INFINITY;
      return leftEffort - rightEffort || left.component.localeCompare(right.component);
    })
    .slice(0, limit);
}

export function buildRefactoringBacklogIssue({
  projectKey,
  observedAt,
  sonarBaseUrl,
  branchName,
  projectMeasures,
  quickWinIssues,
  longFiles,
  complexFiles,
  duplicateFiles,
}: RefactoringBacklogInput) {
  const dashboardUrl = `${trimTrailingSlash(sonarBaseUrl)}/summary/new_code?id=${encodeURIComponent(projectKey)}`;
  const issueTitle = "refactoring backlog";
  const issueBody = [
    REFACTORING_BACKLOG_MARKER,
    "",
    "# Refactoring backlog",
    "",
    `- 観測日時: ${observedAt}`,
    `- 対象ブランチ: \`${branchName}\``,
    `- SonarCloud: [dashboard](${dashboardUrl})`,
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
    "## 今は保留",
    "",
    "- coverage / knip / lint はまだ棚卸し対象に含めていない",
    "- issue 分割や自動 PR は行わず、この issue に集約する",
    "",
    "## メモ",
    "",
    "- `すぐ直す` は修正コストが低い code smell を優先表示",
    "- `構造改善が必要` は局所修正では片付きにくいファイル単位のシグナル",
    "- 最終的な優先度判断は人間が行う",
    "",
  ].join("\n");

  return {
    title: issueTitle,
    body: issueBody,
  };
}

function renderQuickWinIssues(projectKey: string, sonarBaseUrl: string, issues: SonarIssue[]) {
  if (issues.length === 0) {
    return ["- 今回は quick win 候補なし"];
  }

  return issues.map((issue) => {
    const path = normalizeComponentPath(issue.component, projectKey);
    const effort = issue.effortMinutes ? `${issue.effortMinutes} min` : "effort unknown";
    const line = issue.line ? `:${issue.line}` : "";
    const issueUrl = `${trimTrailingSlash(sonarBaseUrl)}/project/issues?id=${encodeURIComponent(projectKey)}&open=${encodeURIComponent(issue.key)}`;
    return `- [${path}${line}](${issueUrl}) - ${issue.message} (${effort})`;
  });
}

function renderRankedSignals(rows: RankedSignal[], valueLabel: string, detailLabel: string) {
  if (rows.length === 0) {
    return ["- 該当なし"];
  }

  return [
    `| file | ${valueLabel} | ${detailLabel} |`,
    "| --- | ---: | --- |",
    ...rows.map(
      (row) => `| \`${row.path}\` | ${formatRankValue(valueLabel, row.value)} | ${row.detail} |`,
    ),
  ];
}

function formatRankValue(label: string, value: number) {
  return label === "duplicated lines density" ? formatPercent(value) : formatNumber(value);
}

function formatMinutes(value: number | undefined) {
  if (value == null) {
    return "-";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatPercent(value: number | undefined) {
  if (value == null) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number | undefined) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
