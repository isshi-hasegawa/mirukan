---
name: worktree-start
description: 作業を始めたいときに使う。現在の worktree とブランチが継続作業に使えるかを判定し、必要なら最新の main から作業ブランチと専用 worktree を作成し、依存未展開なら `vp install` を実行する。
---

# Worktree Start

## 目的

新規作業または既存作業の継続を、リポジトリ運用ルールに沿って開始できる状態へ整える。

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする

## 対象

- 継続作業か新規作業かの判定
- 本体側 `main` の確認と最新化
- ブランチ名の決定
- 作業ブランチと専用 worktree の作成
- 必要に応じた `vp install`

## 判断ルール

- 継続作業なら既存の専用 worktree / branch を優先する
- 新規作業では本体側 `main` を `origin/main` に fast-forward で最新化してから branch を切る
- branch 名は `AGENTS.md` の命名規則に従う
- 新しい worktree で依存が未展開なら `vp install` を実行する

## 推奨手順

1. 現在の worktree / branch / status を確認する
2. 継続作業なら、その worktree を今回の作業場所として確定する
3. 新規作業なら、本体側 `main` worktree に移動する
4. `git fetch origin` と `git pull --ff-only origin main` で最新化する
5. ブランチ名を決める
6. `git switch -c <branch>` と `git worktree add <path> <branch>` で作業場所を作る
7. 依存が未展開なら `vp install` を実行する

## 停止条件

- 継続作業か新規作業かを判断できない
- 本体側の `main` worktree を特定できない
- `main` の最新化に失敗する
- 新しい branch 名を安全に決められない
- 既存 branch / worktree と衝突して上書きの危険がある
- `vp install` が必要だが失敗して作業開始状態にできない

## 出力

- 採用した branch 名
- 使用する worktree の path
- 継続作業として再利用したか、新規作成したか
- 実行した主要コマンド
- `vp install` の実施有無
- 未実施の確認や残リスク
