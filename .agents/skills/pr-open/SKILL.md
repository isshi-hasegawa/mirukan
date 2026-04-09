---
name: pr-open
description: PR を作成したいときに使う。現在の作業ブランチと git diff を確認し、関連 Issue、PR タイトル、PR 本文を整えて Pull Request を作成または更新する。
---

# PR Open

## いつ使うか

- self-review 完了後に PR を新規作成するとき
- 既存 PR の本文やタイトルを差分に合わせて更新するとき

## いつ使わないか

- 差分の主題が複数に割れていて 1 本の PR にまとめるのが不自然なとき
- まだ self-review が済んでいないとき

## 前後関係

- [self-review](../self-review/SKILL.md) → **pr-open**
- [pr-followup](../pr-followup/SKILL.md) から PR 本文の補正で呼ばれることがある

## 目的

現在の作業ブランチから、差分に整合した Pull Request を作成または更新する。

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする
- PR 本文の形式は `.github/pull_request_template.md` を正本とする

## 対象

- 作業ブランチからの PR 作成
- 既存 PR の検出と更新
- 差分ベースでの PR タイトル / 本文生成
- 必要に応じた push

## 判断ルール

- タイトルと本文は作業者の申告ではなく差分ベースで作る
- 関連 Issue は確認できたものだけ記載する
- close すべき Issue は `Closes` / `Fixes`、参照だけなら `Refs` を使う
- 新規 PR は、status 指定がなければ ready for review を標準とする
- 既存 PR は、status 指定がなければ現在の status を維持する
- 既存の open PR がある場合は、新規作成ではなく更新を優先する
- PR 作成や更新の前に `origin/main` を確認し、base との前提差分が古くなっていないかを見る
- 差分の主題が複数に割れている場合は停止する

## 情報収集

- `git status`
- `git fetch origin`
- `git diff --stat <base>...HEAD`
- `git diff <base>...HEAD`
- `git log`
- 変更ファイルの内容
- `.github/pull_request_template.md`

未コミット変更や未 staged 変更は PR 本文の根拠に含めない。

## 推奨手順

1. 現在ブランチとワークツリー状態を確認する
2. `git fetch origin` で `origin/main` を最新化する
3. ローカル / リモート / 既存 PR の状態を確認する
4. 必要なら branch を push する
5. base branch と `HEAD` の差分、コミット履歴を読む
6. テンプレートに沿ってタイトルと本文を生成する
7. GitHub MCP を優先して PR を作成または更新する
8. 差分とのズレがないか確認して結果を報告する

## 停止条件

- 現在ブランチが `main`
- 差分の主題が複数あり 1 本の PR にまとめるのが不自然
- 変更意図が差分から判断できない
- 既存 PR があるのに別 PR を作ると重複する
- 必要な push や更新対象の判断ができない
- base branch を確定できない

## 出力

- PR URL
- PR タイトル
- 関連 Issue の記載内容
- 本文の要約
- 差分とのズレがあって補正した箇所
- 停止した場合はその理由
