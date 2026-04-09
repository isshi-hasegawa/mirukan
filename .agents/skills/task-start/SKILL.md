---
name: task-start
description: 作業を始めたいときに使う。現在の clone とブランチが継続作業に使えるかを判定し、必要なら最新の main から作業ブランチを作成する。並行作業が必要な場合だけ worktree を使う。
---

# Task Start

## 目的

新規作業または既存作業の継続を、リポジトリ運用ルールに沿って開始できる状態へ整える。

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする

## 対象

- 継続作業か新規作業かの判定
- 本体側 `main` の確認と最新化
- ブランチ名の決定
- 作業ブランチの作成
- 必要に応じた worktree 作成
- 必要に応じた `vp install`

## 判断ルール

- 継続作業なら現在の clone / branch をそのまま使う
- 新規作業では本体側 `main` を `origin/main` に fast-forward で最新化してから branch を切る
- branch 名は `AGENTS.md` の命名規則に従う
- 並行開発や隔離が必要な場合だけ worktree を作る
- 新しい作業場所で依存が未展開なら `vp install` を実行する

## 推奨手順

1. 現在の clone / branch / status を確認する
2. 継続作業なら、そのまま今回の作業場所として確定する
3. 新規作業なら `main` を最新化する
4. ブランチ名を決めて `git switch -c <branch>` で作業ブランチを作る
5. 並行開発が必要な場合だけ `git worktree add <path> <branch>` を使う
6. 依存が未展開なら `vp install` を実行する

## 停止条件

- 継続作業か新規作業かを判断できない
- `main` を最新化する場所を安全に確保できない
- `main` の最新化に失敗する
- 新しい branch 名を安全に決められない
- 既存 branch / worktree と衝突して上書きの危険がある
- `vp install` が必要だが失敗して作業開始状態にできない

## 出力

- 採用した branch 名
- 使用する作業場所
- 継続作業として再利用したか、新規開始したか
- 実行した主要コマンド
- `vp install` の実施有無
- 未実施の確認や残リスク
