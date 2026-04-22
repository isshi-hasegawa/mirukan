import { matchesAnyPattern } from "./quality-report-paths.ts";
import { formatNumber } from "./quality-report-render.ts";
import { normalizeComponentPath } from "./quality-report-core.ts";
import type { RankedSignal, SonarFileSignal, SonarIssue } from "./quality-report-types.ts";

const DEFAULT_BACKLOG_EXCLUDE_PATTERNS = [
  "pnpm-lock.yaml",
  "supabase/migrations/**",
  "supabase/*.sample.sql",
  "supabase/templates/**",
] as const;

export function filterBacklogSignals(
  files: SonarFileSignal[],
  excludePatterns: readonly string[] = DEFAULT_BACKLOG_EXCLUDE_PATTERNS,
): SonarFileSignal[] {
  return files.filter((file) => !matchesAnyPattern(file.path, excludePatterns));
}

export function filterBacklogIssues(
  issues: SonarIssue[],
  projectKey: string,
  excludePatterns: readonly string[] = DEFAULT_BACKLOG_EXCLUDE_PATTERNS,
): SonarIssue[] {
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

function compareQuickWinIssues(left: SonarIssue, right: SonarIssue): number {
  return (
    effortOrInfinity(left.effortMinutes) - effortOrInfinity(right.effortMinutes) ||
    left.component.localeCompare(right.component)
  );
}

function effortOrInfinity(value: number | undefined): number {
  return value ?? Number.POSITIVE_INFINITY;
}
