---
name: worktree-cleanup
description: 作業を完全に畳みたいときに使う。何も走っていない前提で、元のリポジトリの main を最新化し、本体 main を残して他の worktree とローカル branch をまとめて破壊的に削除する。
---

# Worktree Cleanup

## 目的

作業用 worktree をまとめて終了し、本体側の `main` だけが残る状態へ戻す。

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする

## 対象

- 本体側 `main` の確認
- 残っている変更の扱いの整理
- worktree とローカル branch の一括削除

## 判断ルール

- この skill は「いま何も走っていない」前提で使う
- 本体側 `main` worktree 以外は、原則としてすべて削除対象にする
- 未コミット変更がある場合は、`commit` / `stash` / `破棄` のどれにするかを先に確定する
- 未 push commit があり、今後参照する可能性があるなら push を検討する
- 変更も commit も不要で、作業を完全に捨てるときだけ `reset --hard` と `clean -fd` を使う

## 推奨手順

1. `git worktree list --porcelain` から本体側 `main` worktree を特定する
2. 削除対象の worktree ごとに未コミット変更と未 push commit を確認する
3. 必要に応じて commit / stash / 破棄を確定する
4. 本体側 `main` を最新化する
5. 本体側 `main` 以外の worktree と不要 branch を削除する
6. 後始末を確認する

## 停止条件

- 本体側の `main` worktree を特定できない
- 未コミット変更があるのに `commit` / `stash` / `破棄` の方針が決まっていない
- 未 push commit を消す判断が未確定
- 何かのプロセスが対象 worktree を使用中で、安全に削除できない
- 元のリポジトリ側でも別作業中で、`main` に戻す場所を安全に確保できない

## 出力

- 閉じた worktree の path 一覧
- 削除したローカル branch の一覧
- 削除前に行った整理内容
- `main` に戻した path
- 実行した主要コマンド
- 未実施の確認や残リスク
