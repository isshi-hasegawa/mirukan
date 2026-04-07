---
name: worktree-close
description: 作業用 worktree を閉じたいときに使う。現在の worktree とブランチの状態を確認し、必要なら commit / stash / 破棄を判断したうえで、元のリポジトリの main を最新化して不要な worktree を削除する。
---

# Worktree Close

## 目的

現在の作業用 worktree を安全に終了し、元のリポジトリの `main` に戻れる状態へ整える。

## 対象

この skill は次の作業を扱う。

- 現在の worktree / branch の確認
- 作業継続か終了かの判定
- 変更の扱いの整理
- 元のリポジトリの `main` の確認と最新化
- 不要になった worktree の削除

## 正本

- リポジトリ固有の運用ルールは `AGENTS.md` を正本とする
- branch / worktree 運用は `AGENTS.md` の作業開始手順と実装後チェックに従う

## 利用ツール

- worktree / branch / status の確認には `git` コマンドを使う
- 依存追加やタスク実行は不要であり、原則として `git` だけで完結する

## 前提ルール

- `main` 上で直接編集やコミットをしない
- 終了対象が現在の作業と無関係な worktree なら触らない
- 追跡済み変更の破棄に `git reset --hard` を使うのは、不要であることが明確な場合だけにする
- 未追跡ファイルの破棄に `git clean -fd` を使うのは、不要であることが明確な場合だけにする
- `git worktree remove` は対象 worktree ディレクトリの外から実行する
- 作業結果を残すべきなら、削除前に commit を優先する

## 実行前チェック

1. `git rev-parse --show-toplevel` で現在位置を確認する
2. `git branch --show-current` で現在 branch を確認する
3. `git worktree list` で worktree の一覧を確認する
4. `git status --short --branch` で未コミット変更の有無を確認する
5. `git log --oneline @{upstream}..HEAD` が使える場合は未 push commit の有無を確認する
6. 現在の worktree が今回閉じたい作業用 worktree か確認する

## 判断ルール

- 現在 branch が `main` なら、この skill で閉じる対象ではない可能性が高い。削除対象の worktree が別にあるか確認する
- 未コミット変更がある場合は、`commit` / `stash` / `破棄` のどれにするかを先に確定する
- 未 push commit があり、今後参照する可能性があるなら push を検討する
- 変更も commit も不要で、作業を完全に捨てるときだけ `reset --hard` と `clean -fd` を使う
- 現在の worktree が今後も継続対象なら削除しない

## 推奨手順

1. 現在の worktree / branch / status を確認する
2. 今の worktree が終了対象かを確認する
3. 変更が残っていれば、次のいずれかで整理する
4. 残したい変更は commit する
5. 一時退避で十分なら `git stash push -u` を使う
6. 不要な変更だけ `git reset --hard HEAD` と `git clean -fd` で破棄する
7. 元のリポジトリに移動する
8. 元のリポジトリの `main` で `git fetch origin` を実行する
9. `origin/main` に差分があれば `git pull --ff-only origin main` で最新化する
10. `git switch main` で `main` に戻る
11. 閉じる対象の worktree を `git worktree remove <path>` で削除する
12. `git worktree list` で後始末を確認する

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

- `git worktree list` から、終了対象ではない本体側の worktree を探す
- 原則として元のリポジトリで `main` を維持する
- 元のリポジトリがすでに `main` で clean なら、その場所を削除実行元に使う
- 元のリポジトリでも別作業中なら、別の安全な場所から `git worktree remove` を実行する

## 停止条件

次の場合は自動で進めず停止する。

- どの worktree を閉じるべきか特定できない
- 未コミット変更があるのに `commit` / `stash` / `破棄` の方針が決まっていない
- 現在の worktree がまだ継続中の作業に見える
- 元のリポジトリ側でも別作業中で、`main` に戻す場所を安全に確保できない

## 出力

終了後は次を報告する。

- 閉じた worktree の path
- 削除前に行った整理内容
- `main` に戻した path
- 実行した主要コマンド
- 未実施の確認や残リスク
