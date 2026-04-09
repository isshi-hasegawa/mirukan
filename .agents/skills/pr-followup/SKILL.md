---
name: pr-followup
description: 既存 PR の追従修正をしたいときに使う。review 指摘や CI 失敗を確認し、対応対象を整理してローカル修正・検証・コミット・push まで進める。
---

# PR Followup

## 目的

現在の Pull Request に対する追従修正を、repo の運用ルールに沿って安全に処理する。

## 正本

- リポジトリ固有の運用ルールは `AGENTS.md` を正本とする
- review thread の取得と分類は `github:gh-address-comments` を正本とする
- CI 失敗の確認とログ取得は `github:gh-fix-ci` を正本とする
- 実装後の差分点検は [`self-review`](../self-review/SKILL.md) を使う
- PR の本文やタイトル更新が必要なときは [`pr-open`](../pr-open/SKILL.md) を使う

## 対象

この skill は次の作業を扱う。

- 対象 PR の特定
- unresolved review thread / inline comment の確認
- CI ステータスと失敗ジョブの確認
- 対応対象の切り分け
- ローカル修正
- 関連テスト実行
- セルフレビュー
- コミットと push
- 必要に応じた PR 本文更新や review comment 返信

## 利用ツール

- review thread の取得には GitHub MCP と `gh` を使う
- CI 状態の確認とログ取得には `gh` を使う
- コード確認、差分確認、commit、push には `git` を使う
- 検証には `vp` を使う
- 手動編集は `apply_patch` を使う

## 前提ルール

- `main` では作業しない
- 既存 PR の作業ブランチ / worktree を優先して使う
- review thread の状態確認は connector の flat comment だけで済ませない
- 指摘や CI 失敗の内容が妥当か確認してから修正する
- 反論や補足だけで閉じる指摘は、無理にコード変更へ寄せない
- `vp check --fix` は pre-commit で自動実行されるため手動では実行しない
- 変更後は必要な `vp test` / `vp build` / `vp check` を実行する
- コミット前に `self-review` を実施する
- コミットメッセージは Conventional Commits の接頭辞付き、日本語の体言止めにする
- PR への返信や thread resolve は、ユーザーが求めたときだけ行う

## 推奨手順

1. 対象 PR を特定する
2. 現在の worktree / branch がその PR の継続作業に使えるか確認する
3. review 指摘が主題なら `github:gh-address-comments` の流れで unresolved thread を取得する
4. CI 失敗が主題なら `github:gh-fix-ci` の流れで失敗ジョブとログを確認する
5. 指摘や失敗を `修正する / 説明する / 見送る` に分類する
6. 影響範囲ごとに変更をまとめて実装する
7. 変更に応じた `vp test` / `vp build` / `vp check` を実行する
8. [`self-review`](../self-review/SKILL.md) の観点で差分と検証結果を点検する
9. 適切な単位でコミットする
10. 必要なら push する
11. PR 説明の更新が必要なら [`pr-open`](../pr-open/SKILL.md) を使って更新する
12. ユーザーが求めた場合だけ review comment に返信する

## 判断ルール

- 既存レビューで既に解消済みの指摘は再対応しない
- 既に再実行で解消した CI 失敗は追わない
- 指摘同士や失敗要因が競合する場合は、そのまま実装せずトレードオフを整理する
- 差分の主題から外れる大規模変更が必要なら停止して確認する
- テスト追加や更新が必要なのに不足している場合は、その場で補う
- 指摘に対する修正が PR 本文の説明とズレる場合は、push 後に `pr-open` で補正する

## 停止条件

次の場合は自動で進めず停止する。

- 対象 PR を特定できない
- 現在の worktree / branch が無関係で、安全な作業場所を確定できない
- review thread や CI ログの文脈が不足していて意図を判断できない
- 指摘や修正方針が競合していて、どちらを優先すべきか決められない
- 修正範囲が PR の主題を超えて別作業になる

## 出力

対応後は次を報告する。

- 対応した review thread / CI 失敗の要約
- 見送った項目と理由
- 実行した `vp` コマンド
- 追加した commit
- push / PR 更新 / review reply の有無
