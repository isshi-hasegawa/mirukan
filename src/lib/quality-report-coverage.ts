import { parseMeasureValue } from "./quality-report-core.ts";
import type { CoverageFile, TestCoverage } from "./quality-report-types.ts";

const LOW_COVERAGE_THRESHOLD = 80;
const LOW_COVERAGE_LIMIT = 5;

type CoverageCounts = {
  lineFound: number;
  lineHit: number;
  branchFound?: number | null;
  branchHit?: number | null;
  functionFound?: number | null;
  functionHit?: number | null;
};

export function parseVitestCoverageSummary(value: string): TestCoverage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  const parsedRecord = asRecord(parsed);
  if (!parsedRecord) {
    return null;
  }

  const total = getRecordValue(parsedRecord, "total");
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
      Object.entries(parsedRecord)
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

export function parseDenoCoverageArtifacts(input: {
  lcovReport: string | null;
  summaryReport: string | null;
}): TestCoverage | null {
  if (input.lcovReport) {
    const lcovCoverage = parseDenoCoverageReport(input.lcovReport);
    if (lcovCoverage) {
      return lcovCoverage;
    }
  }

  if (input.summaryReport) {
    return parseDenoCoverageReport(input.summaryReport);
  }

  return null;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

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

function rankLowCoverageFiles(files: CoverageFile[], limit = LOW_COVERAGE_LIMIT): CoverageFile[] {
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

function getLowestCoverageMetric(file: CoverageFile): number {
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

function readLcovCount(lines: string[], prefix: string): number | null {
  const matched = lines.find((line) => line.startsWith(`${prefix}:`));
  if (!matched) {
    return null;
  }

  return parseMeasureValue(matched.slice(prefix.length + 1));
}

function toCoveragePercent(hit: number | null, found: number | null): number | null {
  if (hit == null || found == null || found === 0) {
    return null;
  }

  return (hit / found) * 100;
}

function normalizeCoveragePath(path: string): string {
  if (!path.startsWith("file://")) {
    return path;
  }

  try {
    return decodeURIComponent(new URL(path).pathname);
  } catch {
    return path;
  }
}

function sumCoverageCount(
  files: Array<CoverageFile & CoverageCounts>,
  key: keyof CoverageCounts,
): number | null {
  const values = files
    .map((file) => file[key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : null;
}
