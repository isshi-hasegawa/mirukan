---
name: renovate-review
description: Renovate の PR を見たいときに使う。PR URL または番号が指定された Renovate PR、または指定がない場合は open 中の Renovate 非 auto-merge 対象 PR 全件について、GitHub 上の PR メタデータと diff を取得し、回帰リスク・運用リスク・未確認事項を整理して各 PR にコメント投稿する。
---

# Renovate Review

## いつ使うか

- Renovate が作成した non-automerge PR のリスクを評価するとき

## いつ使わないか

- 自作の PR を確認するとき（[self-review](../self-review/SKILL.md) を使う）
- Renovate の automerge 対象 PR を確認するとき

## 責務

- PR 指定がない場合は open 中の PR から対象を全件抽出する
- non-automerge の Renovate PR を評価する
- 回帰リスク、運用リスク、未確認事項を整理する
- 対象 PR ごとに GitHub へコメント投稿する

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする
- GitHub 上の PR 情報は GitHub MCP を正本とする
- リスク評価の観点は [`self-review`](../self-review/SKILL.md) のレビュー観点を踏襲する

## 判断ルール

- この skill は Renovate PR 専用とする
- 評価対象は auto-merge されない Renovate PR に限定する
- PR URL または番号が指定された場合は、その PR だけを評価対象にする
- PR URL または番号が指定されていない場合は、open 中の PR を一覧取得し、Renovate が作成した non-automerge PR 全件を評価対象にする
- 対象候補が複数ある場合でも 1 件だけを選ばず、対象全件について順に評価とコメント投稿を行う
- Renovate PR 判定は author、head branch、title、body、labels など GitHub 上で取得できる metadata を根拠にする
- auto-merge 対象かどうかは GitHub 上の auto-merge metadata、labels、PR body など取得できる根拠で判定する
- Renovate PR ではないもの、auto-merge 対象と判定できるもの、判定根拠が不足するものは評価せず、スキップ理由を記録する
- 評価根拠は PR の title、body、diff、必要なら file patch に限定する
- 複数対象のうち一部 PR の取得、評価、コメント投稿に失敗しても、他の対象 PR は継続する
- 実施していない確認は、問題なしと扱わず未確認事項として明示する
- 断定できないものは推測で埋めず、根拠不足として書く
- 指摘の主眼は、依存更新や lockfile 更新による挙動の破壊、設定や型の互換性、運用上の影響に置く

## 手順

1. PR URL または番号が指定されているか確認する
2. 指定がある場合は、その PR の metadata を GitHub MCP で取得する
3. 指定がない場合は、GitHub MCP で open 中の PR 一覧を取得する
4. 取得した PR を Renovate PR、non-automerge PR、対象外 PR に分類する
5. 対象外 PR は理由を記録し、評価対象から外す
6. non-automerge の Renovate PR 全件について、GitHub MCP で metadata と patch を取得する
7. 対象 PR ごとに依存更新によって壊れうる既存挙動を洗い出す
8. 対象 PR ごとに回帰リスク、未確認事項、残リスクを整理する
9. 対象 PR ごとに GitHub へコメント投稿する
10. 投稿済み、スキップ、失敗の PR を一覧化する

## 停止条件

- repo を解決できない
- 指定された PR URL または番号を解決できない
- open 中の PR 一覧を取得できない
- 指定された PR が Renovate PR ではない
- 指定された PR が Renovate auto-merge 対象 PR である
- 指定がない状態で対象となる open Renovate non-automerge PR が 1 件もない
- 差分が大きすぎる PR が多く、対象全体の主題を安全に整理できない

個別 PR の metadata、diff、コメント投稿に失敗した場合は全体停止せず、その PR を失敗として記録して残りを続行する。

## 出力

- 対象抽出の根拠
- 評価結果の本文
- 投稿先 PR ごとの投稿結果
- スキップした PR と理由
- 失敗した PR と理由
- 必要なら、評価根拠にした更新依存や変更領域の短い補足
