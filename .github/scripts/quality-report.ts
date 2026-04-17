import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  buildQualityReportIssue,
  filterBacklogIssues,
  filterBacklogSignals,
  normalizeComponentPath,
  parseDenoCoverageReport,
  parseMeasureValue,
  parseMinutes,
  parseVitestCoverageSummary,
  rankComplexFiles,
  rankDuplicateFiles,
  rankLongFiles,
  selectQuickWinIssues,
  type SonarFileSignal,
  type SonarIssue,
  type SonarMeasureKey,
  type SonarMeasureMap,
} from "../../src/lib/quality-report.ts";

const REQUIRED_ENV_KEYS = ["SONAR_PROJECT_KEY", "SONAR_TOKEN"] as const;
const SONAR_BASE_URL = "https://sonarcloud.io";
const PROJECT_METRICS: SonarMeasureKey[] = [
  "code_smells",
  "sqale_index",
  "duplicated_lines_density",
  "duplicated_blocks",
  "complexity",
  "cognitive_complexity",
  "ncloc",
];
const FILE_METRICS: SonarMeasureKey[] = [
  "code_smells",
  "duplicated_lines_density",
  "complexity",
  "cognitive_complexity",
  "ncloc",
];

type SonarMeasuresResponse = {
  component?: {
    measures?: Array<{ metric: SonarMeasureKey; value?: string }>;
  };
};

type SonarComponentTreeResponse = {
  paging?: { pageIndex: number; pageSize: number; total: number };
  components?: Array<{
    key: string;
    path?: string;
    measures?: Array<{ metric: SonarMeasureKey; value?: string }>;
  }>;
};

type SonarIssuesResponse = {
  paging?: { pageIndex: number; pageSize: number; total: number };
  issues?: Array<{
    key: string;
    message: string;
    component: string;
    line?: number;
    rule?: string;
    effort?: string;
  }>;
};

await main();

async function main() {
  assertRequiredEnv();

  const projectKey = process.env.SONAR_PROJECT_KEY!;
  const branchName = process.env.SONAR_BRANCH || "main";
  const outputDir = resolve(process.env.QUALITY_REPORT_OUTPUT_DIR || "artifacts/quality-report");

  const [
    projectMeasures,
    fileSignals,
    codeSmells,
    bugs,
    vulnerabilities,
    vitestCoverage,
    denoCoverage,
  ] = await Promise.all([
    fetchProjectMeasures({ projectKey, branchName }),
    fetchFileSignals({ projectKey, branchName }),
    fetchIssuesByType({ projectKey, branchName, type: "CODE_SMELL" }),
    fetchIssuesByType({ projectKey, branchName, type: "BUG" }),
    fetchIssuesByType({ projectKey, branchName, type: "VULNERABILITY" }),
    readOptionalFile("coverage/coverage-summary.json").then((value) =>
      value ? parseVitestCoverageSummary(value) : null,
    ),
    readOptionalFile("coverage/deno/report.txt").then((value) =>
      value ? parseDenoCoverageReport(value) : null,
    ),
  ]);

  const observedAt =
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Tokyo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date()) + " JST";

  const bugIssues = filterBacklogIssues(bugs, projectKey);
  const vulnerabilityIssues = filterBacklogIssues(vulnerabilities, projectKey);
  const quickWinIssues = selectQuickWinIssues(filterBacklogIssues(codeSmells, projectKey));
  const filteredFileSignals = filterBacklogSignals(fileSignals);
  const longFiles = rankLongFiles(filteredFileSignals);
  const complexFiles = rankComplexFiles(filteredFileSignals);
  const duplicateFiles = rankDuplicateFiles(filteredFileSignals);
  const issue = buildQualityReportIssue({
    projectKey,
    observedAt,
    sonarBaseUrl: SONAR_BASE_URL,
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
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "title.txt"), `${issue.title}\n`);
  await writeFile(resolve(outputDir, "body.md"), issue.body);

  const summary = [
    "## Quality Report",
    "",
    `- project: \`${projectKey}\``,
    `- code smells: ${projectMeasures.code_smells ?? "-"}`,
    `- quick win issues: ${quickWinIssues.length}`,
    `- long files: ${longFiles.length}`,
    `- complex files: ${complexFiles.length}`,
    `- duplicate files: ${duplicateFiles.length}`,
    "",
  ].join("\n");
  await appendStepSummary(summary);
}

async function readOptionalFile(path: string) {
  try {
    return await readFile(resolve(path), "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

async function fetchProjectMeasures(input: { projectKey: string; branchName: string }) {
  const response = await sonarApi<SonarMeasuresResponse>("/api/measures/component", {
    component: input.projectKey,
    branch: input.branchName,
    metricKeys: PROJECT_METRICS.join(","),
  });

  return collectMeasures(response.component?.measures ?? []);
}

async function fetchFileSignals(input: { projectKey: string; branchName: string }) {
  const components = await paginate<SonarComponentTreeResponse["components"][number]>(
    async (page) => {
      const response = await sonarApi<SonarComponentTreeResponse>("/api/measures/component_tree", {
        component: input.projectKey,
        branch: input.branchName,
        qualifiers: "FIL",
        metricKeys: FILE_METRICS.join(","),
        ps: "100",
        p: String(page),
      });

      return {
        items: response.components ?? [],
        total: response.paging?.total ?? 0,
        pageSize: response.paging?.pageSize ?? 100,
      };
    },
  );

  return components.map((component) => ({
    path: component.path || normalizeComponentPath(component.key, input.projectKey),
    measures: collectMeasures(component.measures ?? []),
  })) satisfies SonarFileSignal[];
}

async function fetchIssuesByType(input: { projectKey: string; branchName: string; type: string }) {
  const issues = await paginate<SonarIssuesResponse["issues"][number]>(async (page) => {
    const response = await sonarApi<SonarIssuesResponse>("/api/issues/search", {
      componentKeys: input.projectKey,
      branch: input.branchName,
      types: input.type,
      statuses: "OPEN,CONFIRMED",
      ps: "100",
      p: String(page),
    });

    return {
      items: response.issues ?? [],
      total: response.paging?.total ?? 0,
      pageSize: response.paging?.pageSize ?? 100,
    };
  });

  return issues.map((issue) => ({
    key: issue.key,
    message: issue.message,
    component: issue.component,
    line: issue.line,
    rule: issue.rule,
    effortMinutes: parseMinutes(issue.effort),
  })) satisfies SonarIssue[];
}

async function paginate<T>(
  fetchPage: (page: number) => Promise<{ items: T[]; total: number; pageSize: number }>,
) {
  const firstPage = await fetchPage(1);
  const items = [...firstPage.items];
  const totalPages = Math.max(1, Math.ceil(firstPage.total / firstPage.pageSize));

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await fetchPage(page);
    items.push(...nextPage.items);
  }

  return items;
}

function collectMeasures(
  measures: Array<{ metric: SonarMeasureKey; value?: string }>,
): SonarMeasureMap {
  return Object.fromEntries(
    measures
      .map((measure) => [measure.metric, parseMeasureValue(measure.value)] as const)
      .filter((entry): entry is [SonarMeasureKey, number] => entry[1] != null),
  );
}

async function sonarApi<T>(path: string, searchParams: Record<string, string>): Promise<T> {
  const url = new URL(path, `${SONAR_BASE_URL}/`);
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.SONAR_TOKEN}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SonarCloud API request failed: ${response.status} ${response.statusText} (${url})`,
    );
  }

  return (await response.json()) as T;
}

async function appendStepSummary(markdown: string) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  await mkdir(dirname(summaryPath), { recursive: true });
  await writeFile(summaryPath, `${markdown}\n`, { flag: "a" });
}

function assertRequiredEnv() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
