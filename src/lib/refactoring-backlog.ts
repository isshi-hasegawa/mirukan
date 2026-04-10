const REFACTORING_BACKLOG_MARKER = "<!-- refactoring-backlog:sonarcloud -->";
const DEFAULT_BACKLOG_EXCLUDE_PATTERNS = ["pnpm-lock.yaml", "supabase/templates/**"] as const;
const REPO_PATH_SEGMENTS = ["src/", "supabase/", ".github/", "docs/", "public/"] as const;

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

type QuickWinGroup = {
  key: string;
  label: string;
  count: number;
  examples: SonarIssue[];
  minEffortMinutes?: number;
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

  let totalMinutes = 0;
  let currentNumber = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (!character) {
      continue;
    }

    if (character >= "0" && character <= "9") {
      currentNumber += character;
      continue;
    }

    if (character === " " || character === "\t") {
      continue;
    }

    const amount = Number(currentNumber);
    currentNumber = "";

    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    if (character === "d") {
      totalMinutes += amount * 60 * 8;
      continue;
    }

    if (character === "h") {
      totalMinutes += amount * 60;
      continue;
    }

    if (character === "m" && value[index + 1] === "i" && value[index + 2] === "n") {
      totalMinutes += amount;
      index += 2;
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
  const sorted = [...issues].sort((left, right) => {
    const leftEffort = left.effortMinutes ?? Number.POSITIVE_INFINITY;
    const rightEffort = right.effortMinutes ?? Number.POSITIVE_INFINITY;
    return leftEffort - rightEffort || left.component.localeCompare(right.component);
  });

  if (sorted.length <= limit) {
    return sorted;
  }

  const cutoffEffort = sorted[limit - 1]?.effortMinutes;
  if (cutoffEffort == null) {
    return sorted.slice(0, limit);
  }

  return sorted.filter(
    (issue) => (issue.effortMinutes ?? Number.POSITIVE_INFINITY) <= cutoffEffort,
  );
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

  return groupQuickWinIssues(issues, projectKey).flatMap((group) => {
    const effortLabel = group.minEffortMinutes
      ? `最短 ${group.minEffortMinutes} min`
      : "effort unknown";
    const lines = [`- ${group.label} - ${formatNumber(group.count)}件 (${effortLabel})`];

    for (const example of group.examples) {
      const path = toDisplayPath(normalizeComponentPath(example.component, projectKey));
      const line = example.line ? `:${example.line}` : "";
      const issueUrl = `${trimTrailingSlash(sonarBaseUrl)}/project/issues?id=${encodeURIComponent(projectKey)}&open=${encodeURIComponent(example.key)}`;
      lines.push(`  - 例: [${path}${line}](${issueUrl})`);
    }

    return lines;
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
      (row) =>
        `| \`${toDisplayPath(row.path)}\` | ${formatRankValue(valueLabel, row.value)} | ${row.detail} |`,
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

function groupQuickWinIssues(issues: SonarIssue[], projectKey: string): QuickWinGroup[] {
  const grouped = new Map<string, QuickWinGroup>();

  for (const issue of issues) {
    const label = sanitizeQuickWinLabel(issue.message);
    const key = issue.rule ? `${issue.rule}::${label}` : label;
    const current = grouped.get(key);

    if (current) {
      current.count += 1;
      current.minEffortMinutes = minDefined(current.minEffortMinutes, issue.effortMinutes);
      if (current.examples.length < 3) {
        current.examples.push(issue);
      }
      continue;
    }

    grouped.set(key, {
      key,
      label,
      count: 1,
      examples: [issue],
      minEffortMinutes: issue.effortMinutes,
    });
  }

  return [...grouped.values()].sort((left, right) => {
    const leftEffort = left.minEffortMinutes ?? Number.POSITIVE_INFINITY;
    const rightEffort = right.minEffortMinutes ?? Number.POSITIVE_INFINITY;
    const leftExamplePath = normalizeComponentPath(left.examples[0]?.component ?? "", projectKey);
    const rightExamplePath = normalizeComponentPath(right.examples[0]?.component ?? "", projectKey);

    return (
      leftEffort - rightEffort ||
      right.count - left.count ||
      leftExamplePath.localeCompare(rightExamplePath) ||
      left.key.localeCompare(right.key)
    );
  });
}

function sanitizeQuickWinLabel(message: string) {
  return sanitizeAbsolutePaths(message);
}

function matchesAnyPattern(path: string, patterns: readonly string[]) {
  return patterns.some((pattern) => matchesGlobPattern(path, pattern));
}

function matchesGlobPattern(path: string, pattern: string) {
  const normalizedPath = normalizePathForMatch(path);
  const normalizedPattern = normalizePathForMatch(pattern);
  const source = normalizedPattern
    .replaceAll(/[|\\{}()[\]^$+?.]/g, String.raw`\$&`)
    .replaceAll(/\*\*/g, "__DOUBLE_STAR__")
    .replaceAll(/\*/g, "[^/]*")
    .replaceAll(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${source}$`).test(normalizedPath);
}

function normalizePathForMatch(value: string) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function sanitizeAbsolutePaths(value: string) {
  return value.replaceAll(/\/[^"'`\s)]+/g, (token) => toDisplayPath(token));
}

function toDisplayPath(value: string) {
  const normalized = normalizePathForMatch(value);
  if (!normalized.startsWith("/")) {
    return normalized;
  }

  for (const segment of REPO_PATH_SEGMENTS) {
    const marker = `/${segment}`;
    const index = normalized.lastIndexOf(marker);
    if (index >= 0) {
      return normalized.slice(index + 1);
    }
  }

  if (normalized.endsWith("/pnpm-lock.yaml")) {
    return "pnpm-lock.yaml";
  }

  return normalized.split("/").findLast(Boolean) ?? normalized;
}

function minDefined(left: number | undefined, right: number | undefined) {
  if (left == null) {
    return right;
  }

  if (right == null) {
    return left;
  }

  return Math.min(left, right);
}
