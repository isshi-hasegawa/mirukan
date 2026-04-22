import { trimTrailingSlash } from "./quality-report-core.ts";
import {
  formatMinutes,
  formatNumber,
  formatPercent,
  renderCoverageFiles,
  renderIssueList,
  renderQuickWinIssues,
  renderRankedSignals,
} from "./quality-report-render.ts";
import type { QualityReportInput, SonarIssue, TestCoverage } from "./quality-report-types.ts";

const QUALITY_REPORT_MARKER = "<!-- quality-report:sonarcloud -->";

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

function renderCoverageFileSection(coverage: TestCoverage | null): string[] {
  if (!coverage) {
    return ["- 取得不可"];
  }

  return renderCoverageFiles(coverage.lowCoverageFiles);
}

function buildQualityReportTitle(input: { observedAt: string; branchName: string }): string {
  return `quality report snapshot (${input.branchName} / ${extractObservedDate(input.observedAt)})`;
}

function extractObservedDate(value: string): string {
  const matched = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return matched?.[1] ?? value;
}

function renderIssueSection(
  projectKey: string,
  sonarBaseUrl: string,
  issues: SonarIssue[],
): string[] {
  if (issues.length === 0) {
    return ["- 該当なし"];
  }

  return renderIssueList(projectKey, sonarBaseUrl, issues);
}
