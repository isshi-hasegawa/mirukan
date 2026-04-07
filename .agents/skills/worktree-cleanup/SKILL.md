---
name: worktree-cleanup
description: 作業を完全に畳みたいときに使う。何も走っていない前提で、元のリポジトリの main を最新化し、本体 main を残して他の worktree とローカル branch をまとめて破壊的に削除する。
---

# Worktree Cleanup

## 目的

作業用 worktree をまとめて終了し、本体側の `main` だけが残る状態へ戻す。

## 対象

この skill は次の作業を扱う。

- 現在位置と本体側 `main` の確認
- 全 worktree の一覧確認
- 残っている変更の扱いの整理
- 元のリポジトリの `main` の確認と最新化
- 本体側 `main` 以外の worktree の一括削除
- `main` 以外のローカル branch の一括削除

## 正本

- リポジトリ固有の運用ルールは `AGENTS.md` を正本とする
- branch / worktree 運用は `AGENTS.md` の作業開始手順と実装後チェックに従う

## 利用ツール

- worktree / branch / status の確認には `git` コマンドを使う
- 依存追加やタスク実行は不要であり、原則として `git` だけで完結する

## 前提ルール

- この skill は「いま何も走っていない」前提で使う
- `main` 上で直接編集やコミットをしない
- 本体側 `main` worktree だけを残し、それ以外は削除対象とみなす
- 追跡済み変更の破棄に `git reset --hard` を使うのは、不要であることが明確な場合だけにする
- 未追跡ファイルの破棄に `git clean -fd` を使うのは、不要であることが明確な場合だけにする
- `git worktree remove` は対象 worktree ディレクトリの外から実行する
- 作業結果を残すべきなら、削除前に commit または push を優先する
- ローカル branch 削除は `main` 上で行う

## 実行前チェック

1. `git rev-parse --show-toplevel` で現在位置を確認する
2. `git branch --show-current` で現在 branch を確認する
3. `git worktree list --porcelain` で worktree の一覧を確認する
4. 本体側の `main` worktree がどこか確認する
5. 削除候補の各 worktree で `git status --short --branch` を確認する
6. `git log --oneline @{upstream}..HEAD` が使える場合は各 branch の未 push commit の有無を確認する
7. 現在の作業を残す必要がないことを確認する

## 判断ルール

- 本体側 `main` worktree 以外は、原則としてすべて削除対象にする
- 未コミット変更がある場合は、`commit` / `stash` / `破棄` のどれにするかを先に確定する
- 未 push commit があり、今後参照する可能性があるなら push を検討する
- 変更も commit も不要で、作業を完全に捨てるときだけ `reset --hard` と `clean -fd` を使う
- ローカル branch は `main` に取り込まれていれば `git branch -d`、未取り込みでも捨てる前提なら `git branch -D` を使う

## 推奨手順

1. 現在の worktree / branch / status を確認する
2. `git worktree list --porcelain` から本体側 `main` worktree を特定する
3. 削除対象の worktree ごとに未コミット変更と未 push commit を確認する
4. 残したい変更は commit する
5. 一時退避で十分なら `git stash push -u` を使う
6. 不要な変更だけ `git reset --hard HEAD` と `git clean -fd` で破棄する
7. 本体側の `main` worktree に移動する
8. `git fetch origin` を実行する
9. `origin/main` に差分があれば `git pull --ff-only origin main` で最新化する
10. `git switch main` で `main` に戻る
11. 本体側 `main` 以外の worktree を `git worktree remove <path>` で一括削除する
12. `git branch --merged main` と `git branch --no-merged main` でローカル branch を整理する
13. 不要な branch を `git branch -d` または `git branch -D` で削除する
14. `git worktree list --porcelain` と `git branch` で後始末を確認する

## 変更整理の扱い

### commit する場合

- 作業結果を残す価値があるなら commit を優先する
- コミットメッセージは Conventional Commits の接頭辞を付け、日本語の体言止めにする
- commit 後に pre-commit が失敗した場合は、その指摘を直して再コミットする

### stash する場合

- すぐには不要だが消したくない変更は `git stash push -u` で退避する
- stash を作った理由と、戻す前提があるかを明示する

### 破棄する場合

- 追跡済み変更の破棄は `git reset --hard HEAD`
- 未追跡ファイルの破棄は `git clean -fd`
- どちらも復元前提ではないため、不要であることを確認してから実行する

## 元のリポジトリの扱い

- `git worktree list --porcelain` から、本体側の `main` worktree を探す
- 原則として元のリポジトリで `main` を維持する
- 元のリポジトリがすでに `main` で clean なら、その場所を削除実行元に使う
- 元のリポジトリでも別作業中なら、別の安全な場所から `git worktree remove` を実行する

## 停止条件

次の場合は自動で進めず停止する。

- 本体側の `main` worktree を特定できない
- 未コミット変更があるのに `commit` / `stash` / `破棄` の方針が決まっていない
- 未 push commit を消す判断が未確定
- 何かのプロセスが対象 worktree を使用中で、安全に削除できない
- 元のリポジトリ側でも別作業中で、`main` に戻す場所を安全に確保できない

## 出力

終了後は次を報告する。

- 閉じた worktree の path 一覧
- 削除したローカル branch の一覧
- 削除前に行った整理内容
- `main` に戻した path
- 実行した主要コマンド
- 未実施の確認や残リスク
