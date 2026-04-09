---
name: pr-address-review
description: PR のレビュー指摘を対応したいときに使う。GitHub 上の unresolved thread や inline comment を確認し、修正対象を整理してローカル実装・テスト・コミット・push まで進める。
---

# PR Address Review

## 目的

現在の Pull Request に付いたレビュー指摘を、repo の運用ルールに沿って安全に処理する。

## 正本

- リポジトリ固有の運用ルールは `AGENTS.md` を正本とする
- review thread の取得と分類は [`github:gh-address-comments`](/Users/hasegawamasashi/.codex/plugins/cache/openai-curated/github/b4940fd0a222022ecd7852e20a4c89ed36b9e9de/skills/gh-address-comments/SKILL.md) を正本とする
- 実装後の差分点検は [`self-review`](/Users/hasegawamasashi/src/github.com/isshi-hasegawa/mirukan/.agents/skills/self-review/SKILL.md) を使う
- PR の本文やタイトル更新が必要なときは [`pr-open`](/Users/hasegawamasashi/src/github.com/isshi-hasegawa/mirukan/.agents/skills/pr-open/SKILL.md) を使う

## 対象

この skill は次の作業を扱う。

- 対象 PR の特定
- unresolved review thread / inline comment の確認
- 対応対象の切り分け
- ローカル修正
- 関連テスト実行
- セルフレビュー
- コミットと push
- 必要に応じた PR 本文更新や review comment 返信

## 利用ツール

- review thread の取得には GitHub MCP と `gh` を使う
- コード確認、差分確認、commit、push には `git` を使う
- 検証には `vp test` を使う
- 手動編集は `apply_patch` を使う

## 前提ルール

- `main` では作業しない
- 既存 PR の作業ブランチ / worktree を優先して使う
- review thread の状態確認は connector の flat comment だけで済ませない
- 指摘が妥当か確認してから修正する
- 反論や補足だけで閉じる指摘は、無理にコード変更へ寄せない
- 変更後は必要な `vp test` を実行する
- コミット前に `self-review` を実施する
- コミットメッセージは Conventional Commits の接頭辞付き、日本語の体言止めにする
- PR への返信や thread resolve は、ユーザーが求めたときだけ行う

## 推奨手順

1. 対象 PR を特定する
2. 現在の worktree / branch がその PR の継続作業に使えるか確認する
3. [`github:gh-address-comments`](/Users/hasegawamasashi/.codex/plugins/cache/openai-curated/github/b4940fd0a222022ecd7852e20a4c89ed36b9e9de/skills/gh-address-comments/SKILL.md) の流れで unresolved thread を取得する
4. 指摘を `修正する / 説明する / 見送る` に分類する
5. 影響範囲ごとに変更をまとめて実装する
6. 変更に応じた `vp test` を実行する
7. [`self-review`](/Users/hasegawamasashi/src/github.com/isshi-hasegawa/mirukan/.agents/skills/self-review/SKILL.md) の観点で差分と検証結果を点検する
8. 適切な単位でコミットする
9. 必要なら push する
10. PR 説明の更新が必要なら [`pr-open`](/Users/hasegawamasashi/src/github.com/isshi-hasegawa/mirukan/.agents/skills/pr-open/SKILL.md) を使って更新する
11. ユーザーが求めた場合だけ review comment に返信する

## 判断ルール

- 既存レビューで既に解消済みの指摘は再対応しない
- 指摘同士が競合する場合は、そのまま実装せずトレードオフを整理する
- 差分の主題から外れる大規模変更が必要なら停止して確認する
- テスト追加や更新が必要なのに不足している場合は、その場で補う
- 指摘に対する修正が PR 本文の説明とズレる場合は、push 後に `pr-open` で補正する

## 停止条件

次の場合は自動で進めず停止する。

- 対象 PR を特定できない
- 現在の worktree / branch が無関係で、安全な作業場所を確定できない
- review thread の文脈が不足していて指摘意図を判断できない
- 指摘が競合していて、どちらを優先すべきか決められない
- 修正範囲が PR の主題を超えて別作業になる

## 出力

対応後は次を報告する。

- 対応した thread の要約
- 見送った thread と理由
- 実行した `vp test`
- 追加した commit
- push / PR 更新 / review reply の有無
