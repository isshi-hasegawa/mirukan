---
name: pr-followup
description: 既存 PR の追従修正をしたいときに使う。review 指摘や CI 失敗を確認し、対応対象を整理してローカル修正・検証・コミット・push まで進める。
---

# PR Followup

## 目的

現在の Pull Request に対する追従修正を、安全に切り分けて完了まで進める。

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする
- review thread の取得と分類は `github:gh-address-comments` を正本とする
- CI 失敗の確認とログ取得は `github:gh-fix-ci` を正本とする

## 対象

- review 指摘対応
- CI 失敗対応
- 必要に応じた PR 本文更新

## 判断ルール

- 既存レビューで既に解消済みの指摘は再対応しない
- 既に再実行で解消した CI 失敗は追わない
- review 指摘が主題なら `github:gh-address-comments` の流れを使う
- CI 失敗が主題なら `github:gh-fix-ci` の流れを使う
- 反論や補足だけで閉じる指摘は、無理にコード変更へ寄せない
- 指摘同士や失敗要因が競合する場合は、そのまま実装せずトレードオフを整理する
- PR 本文の説明と修正がズレた場合だけ [`pr-open`](../pr-open/SKILL.md) で補正する
- 検証コマンドは `AGENTS.md` に従って選ぶ
- `vp check` / `vp check --fix` は `AGENTS.md` の例外条件を満たす場合だけ手動実行する

## 推奨手順

1. 対象 PR を特定する
2. 現在の worktree / branch がその PR の継続作業に使えるか確認する
3. review 指摘または CI 失敗を取得する
4. 項目を `修正する / 説明する / 見送る` に分類する
5. 影響範囲ごとに変更をまとめて実装する
6. `AGENTS.md` に従って必要な検証を実行する
7. [`self-review`](../self-review/SKILL.md) で差分と検証結果を点検する
8. コミットし、必要なら push する
9. 必要時のみ [`pr-open`](../pr-open/SKILL.md) や review reply に進む

## 停止条件

- 対象 PR を特定できない
- 現在の worktree / branch が無関係で、安全な作業場所を確定できない
- review thread や CI ログの文脈が不足していて意図を判断できない
- 指摘や修正方針が競合していて、どちらを優先すべきか決められない
- 修正範囲が PR の主題を超えて別作業になる

## 出力

- 対応した review thread / CI 失敗の要約
- 見送った項目と理由
- 実行した `vp` コマンド
- 追加した commit
- push / PR 更新 / review reply の有無
