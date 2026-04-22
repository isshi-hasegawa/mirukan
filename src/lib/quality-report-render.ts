import { normalizeComponentPath, trimTrailingSlash } from "./quality-report-core.ts";
import { sanitizeAbsolutePaths, toDisplayPath } from "./quality-report-paths.ts";

type SonarIssueLike = {
  key: string;
  message: string;
  component: string;
  line?: number;
  rule?: string;
  effortMinutes?: number;
};

type RankedSignalLike = {
  path: string;
  value: number;
  detail: string;
};

type CoverageFileLike = {
  path: string;
  lines: number;
  branches?: number | null;
  functions?: number | null;
};

type QuickWinGroup = {
  key: string;
  label: string;
  count: number;
  examples: SonarIssueLike[];
  minEffortMinutes?: number;
};

export function renderIssueList(
  projectKey: string,
  sonarBaseUrl: string,
  issues: SonarIssueLike[],
) {
  return issues.map((issue) => {
    const path = toDisplayPath(normalizeComponentPath(issue.component, projectKey));
    const line = issue.line ? `:${issue.line}` : "";
    const issueUrl = `${trimTrailingSlash(sonarBaseUrl)}/project/issues?id=${encodeURIComponent(projectKey)}&open=${encodeURIComponent(issue.key)}`;
    return `- [${path}${line}](${issueUrl}) — ${sanitizeAbsolutePaths(issue.message)}`;
  });
}

export function renderQuickWinIssues(
  projectKey: string,
  sonarBaseUrl: string,
  issues: SonarIssueLike[],
) {
  if (issues.length === 0) {
    return ["- 今回は quick win 候補なし"];
  }

  return groupQuickWinIssues(issues, projectKey).flatMap((group) => [
    renderQuickWinGroupHeader(group),
    ...group.examples.map((example) => renderQuickWinExample(example, projectKey, sonarBaseUrl)),
  ]);
}

export function renderRankedSignals(
  rows: RankedSignalLike[],
  valueLabel: string,
  detailLabel: string,
) {
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

export function renderCoverageFiles(rows: CoverageFileLike[]) {
  if (rows.length === 0) {
    return ["- 該当なし"];
  }

  return [
    "| file | lines | branches | functions |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| \`${toDisplayPath(row.path)}\` | ${formatPercent(row.lines)} | ${formatOptionalPercent(row.branches)} | ${formatOptionalPercent(row.functions)} |`,
    ),
  ];
}

export function formatMinutes(value: number | undefined) {
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

export function formatPercent(value: number | undefined) {
  if (value == null) {
    return "-";
  }

  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number | undefined) {
  if (value == null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function renderQuickWinGroupHeader(group: QuickWinGroup) {
  const effortLabel = group.minEffortMinutes
    ? `最短 ${group.minEffortMinutes} min`
    : "effort unknown";
  return `- ${group.label} - ${formatNumber(group.count)}件 (${effortLabel})`;
}

function renderQuickWinExample(example: SonarIssueLike, projectKey: string, sonarBaseUrl: string) {
  const path = toDisplayPath(normalizeComponentPath(example.component, projectKey));
  const line = example.line ? `:${example.line}` : "";
  const issueUrl = `${trimTrailingSlash(sonarBaseUrl)}/project/issues?id=${encodeURIComponent(projectKey)}&open=${encodeURIComponent(example.key)}`;
  return `  - 例: [${path}${line}](${issueUrl})`;
}

function formatRankValue(label: string, value: number) {
  return label === "duplicated lines density" ? formatPercent(value) : formatNumber(value);
}

function formatOptionalPercent(value: number | null | undefined) {
  return value == null ? "-" : formatPercent(value);
}

function groupQuickWinIssues(issues: SonarIssueLike[], projectKey: string): QuickWinGroup[] {
  const grouped = new Map<string, QuickWinGroup>();

  for (const issue of issues) {
    const label = sanitizeAbsolutePaths(issue.message);
    const key = issue.rule ? `${issue.rule}::${label}` : label;
    mergeIssueIntoGroup(grouped, key, label, issue);
  }

  return [...grouped.values()].sort((left, right) =>
    compareQuickWinGroups(left, right, projectKey),
  );
}

function mergeIssueIntoGroup(
  grouped: Map<string, QuickWinGroup>,
  key: string,
  label: string,
  issue: SonarIssueLike,
) {
  const current = grouped.get(key);
  if (!current) {
    grouped.set(key, {
      key,
      label,
      count: 1,
      examples: [issue],
      minEffortMinutes: issue.effortMinutes,
    });
    return;
  }

  current.count += 1;
  current.minEffortMinutes = minDefined(current.minEffortMinutes, issue.effortMinutes);
  if (current.examples.length < 3) {
    current.examples.push(issue);
  }
}

function compareQuickWinGroups(left: QuickWinGroup, right: QuickWinGroup, projectKey: string) {
  const leftExamplePath = normalizeComponentPath(left.examples[0]?.component ?? "", projectKey);
  const rightExamplePath = normalizeComponentPath(right.examples[0]?.component ?? "", projectKey);

  return (
    effortOrInfinity(left.minEffortMinutes) - effortOrInfinity(right.minEffortMinutes) ||
    right.count - left.count ||
    leftExamplePath.localeCompare(rightExamplePath) ||
    left.key.localeCompare(right.key)
  );
}

function effortOrInfinity(value: number | undefined) {
  return value ?? Number.POSITIVE_INFINITY;
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
