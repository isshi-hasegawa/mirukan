---
name: renovate-review
description: Renovate の PR を見たいときに使う。Renovate の非 auto-merge 対象 PR について、PR URL または番号から GitHub 上の PR メタデータと diff を取得し、回帰リスク・運用リスク・未確認事項を整理する。コメント投稿が必要な場合だけ GitHub に反映する。
---

# Renovate Review

## いつ使うか

- Renovate が作成した non-automerge PR のリスクを評価するとき

## いつ使わないか

- 自作の PR を確認するとき（[self-review](../self-review/SKILL.md) を使う）
- Renovate の automerge 対象 PR を確認するとき

## 前後関係

- 通常の作業フローとは独立した例外 skill
- リスク評価の観点は [self-review](../self-review/SKILL.md) を踏襲する

## 目的

Renovate が作成した non-automerge PR について、差分ベースのリスク評価を行う。

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする
- GitHub 上の PR 情報は GitHub MCP を正本とする
- リスク評価の観点は [`self-review`](../self-review/SKILL.md) のレビュー観点を踏襲する

## 対象

- Renovate PR かどうかの判定
- auto-merge 対象かどうかの判定
- PR メタデータ / diff の取得
- 回帰リスク、運用リスク、未確認事項の整理
- 必要に応じた GitHub コメント投稿

## モード

- read-only: 評価結果を返すだけで投稿しない
- write: 評価結果を GitHub コメントとして投稿する

ユーザーが明示的に投稿を求めた場合だけ `write` にする。指定がなければ `read-only` を標準とする。

## 判断ルール

- この skill は Renovate PR 専用とする
- 評価対象は auto-merge されない Renovate PR に限定する
- 評価根拠は PR の title、body、diff、必要なら file patch に限定する
- 実施していない確認は、問題なしと扱わず未確認事項として明示する
- 断定できないものは推測で埋めず、根拠不足として書く
- 指摘の主眼は、依存更新や lockfile 更新による挙動の破壊、設定や型の互換性、運用上の影響に置く

## 推奨手順

1. PR 識別子を解決する
2. Renovate PR かつ non-automerge かを判定する
3. GitHub MCP で metadata と patch を取得する
4. 依存更新によって壊れうる既存挙動を洗い出す
5. 回帰リスク、未確認事項、残リスクを整理する
6. `write` の場合だけ GitHub にコメント投稿する

## 停止条件

- repo または PR 番号を解決できない
- PR metadata または diff を取得できない
- Renovate PR ではない
- Renovate auto-merge 対象 PR である
- 差分が大きすぎて主題を安全に要約できない
- コメント投稿に失敗する

## 出力

- 評価結果の本文
- `write` の場合は投稿先 PR と投稿結果
- 必要なら、評価根拠にした更新依存や変更領域の短い補足
