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

export type CoverageFile = {
  path: string;
  lines: number;
  branches?: number | null;
  functions?: number | null;
};

export type TestCoverage = {
  lines: number;
  branches?: number | null;
  functions?: number | null;
  lowCoverageFiles: CoverageFile[];
};

export type RankedSignal = {
  path: string;
  value: number;
  detail: string;
};

export type QualityReportInput = {
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
