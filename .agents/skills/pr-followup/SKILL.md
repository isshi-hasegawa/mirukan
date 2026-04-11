---
name: pr-followup
description: 既存 open PR の追従修正に使う。レビュー、CI、ユーザー所見を整理して修正・検証・コミット・push まで進める。
---

# PR Followup

## いつ使うか

- PR の review 指摘を対応するとき
- PR の CI が失敗して修正が必要なとき
- PR の主題に関するユーザー所見を受けて追従修正するとき

## いつ使わないか

- PR がまだ存在しないとき
- 新規の実装作業を始めるとき

## 責務

- review 指摘、CI 失敗、SonarCloud 指摘、ユーザー所見を整理する
- ローカル修正、検証、コミット、必要なら push まで進める
- 修正後は self-review を行い、必要なら pr-open へつなぐ

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする
- review thread の取得と分類は GitHub MCP と `gh` を使う
- CI 失敗の確認とログ取得は GitHub MCP と `gh` を使う
- SonarCloud 指摘の確認は SonarCloud の PR 向け API を使う

## 判断ルール

- 既存レビューで既に解消済みの指摘は再対応しない
- 既に再実行で解消した CI 失敗は追わない
- SonarCloud の open issues がある場合は、review / CI と同じ変更文脈で確認する
- 既存 open PR の主題に沿うユーザー所見も継続作業として扱う
- review 指摘が主題なら unresolved thread を優先して確認する
- CI 失敗が主題なら失敗ジョブとログを優先して確認する
- SonarCloud は Quality Gate の pass / fail だけで済ませず、open issue の件数と中身を確認する
- 反論や補足だけで閉じる指摘は見送る
- 対応済みの review thread は返信せず resolve する
- 指摘同士や失敗要因が競合する場合は、そのまま実装せずトレードオフを整理する
- review 対応や CI 修正に入る前に `origin/main` を確認し、前提差分がないかを見る
- レビュー対応後、現在の PR 本文と差分を照合し、以下の基準で `pr-open` 呼び出しを判断する
  - 更新が必要: 新しいファイル・コンポーネント・機能が増えて本文に記述がない／実装アプローチが変わった（設計・アルゴリズム変更）／スコープが広がった
  - push だけで十分: 本文で既に説明している機能のバグ修正・スタイル修正／レビュー指摘へのコード改善（変数名・コメント整理など）／既述機能へのテスト追加
- 検証コマンドは `AGENTS.md` に従って選ぶ
- `vp check` / `vp check --fix` は `AGENTS.md` の例外条件を満たす場合だけ手動実行する

## 情報収集

- review thread の確認は GitHub MCP を優先し、thread 状態が必要な場合は `gh api graphql` を使う
- CI 状態の確認は `gh pr checks`、失敗ログの確認は `gh run list` と `gh run view --log-failed` を使う
- SonarCloud の確認は PR 番号を使って `https://sonarcloud.io/api/issues/search?componentKeys=<project>&pullRequest=<number>&statuses=OPEN,CONFIRMED&ps=100` を取得する
- SonarCloud の project key は既存の SonarCloud comment や check 名から特定し、推測で決め打ちしない
- SonarCloud の API 応答から `component` `line` `rule` `severity` `message` を抜き、修正対象の一覧に含める
- top-level comment の要約だけなら connector の flat comment を使ってよい
- review location や unresolved 状態の確認を flat comment だけで済ませない

## 手順

1. 対象 PR を特定する
2. 現在の worktree / branch がその PR の継続作業に使えるか確認する
3. `git fetch origin` で `origin/main` を確認できる状態にする
4. review 指摘が主題なら GitHub MCP または `gh api graphql` で unresolved thread を取得する
5. CI 失敗が主題なら `gh pr checks`、`gh run list`、`gh run view --log-failed` で失敗内容を取得する
6. SonarCloud check や comment がある場合は API で open issues を取得する
7. review / CI / SonarCloud / ユーザー所見を合わせて項目を `修正する / 見送る` に分類する
8. 影響範囲ごとに変更をまとめて実装する
9. `AGENTS.md` に従って必要な検証を実行する
10. [`self-review`](../self-review/SKILL.md) で差分と検証結果を点検する
11. コミットし、必要なら push する
12. 対応済み thread は resolve する。必要時のみ [`pr-open`](../pr-open/SKILL.md) に進む

## 停止条件

- 対象 PR を特定できない
- 現在の worktree / branch が無関係で、安全な作業場所を確定できない
- review thread や CI ログの文脈が不足していて意図を判断できない
- SonarCloud の issue 一覧を取得できず、指摘内容を本文や check だけでは復元できない
- 指摘や修正方針が競合していて、どちらを優先すべきか決められない
- 修正範囲が PR の主題を超えて別作業になる

## 出力

- 対応した review thread / CI 失敗の要約
- 対応した SonarCloud 指摘の要約
- 見送った項目と理由
- 実行した `vp` コマンド
- 追加した commit
- push / PR 更新 / thread resolve の有無
