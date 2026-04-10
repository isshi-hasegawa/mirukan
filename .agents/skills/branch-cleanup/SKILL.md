---
name: branch-cleanup
description: 作業後の掃除をしたいときに使う。不要なローカル branch を整理し、必要なら余っている worktree も片付ける。
---

# Branch Cleanup

## いつ使うか

- 作業完了後に不要なローカル branch を整理するとき
- 余った worktree を片付けるとき

## いつ使わないか

- 作業がまだ終わっていないとき
- 対象 branch にまだ参照する可能性のある変更が残っているとき

## 責務

- 不要なローカル branch を整理する
- 必要時のみ余った worktree を削除する

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする

## 判断ルール

- 削除前に未コミット変更と未 push commit の有無を確認する
- branch 整理を標準とし、worktree 削除は必要時だけ行う
- 未コミット変更がある場合は、`commit` / `stash` / `破棄` のどれにするかを先に確定する
- 未 push commit があり、今後参照する可能性があるなら push を検討する
- 変更も commit も不要で、作業を完全に捨てるときだけ `reset --hard` と `clean -fd` を使う

## 手順

1. 削除候補の branch と worktree を洗い出す
2. 未コミット変更と未 push commit を確認する
3. 必要に応じて commit / stash / 破棄を確定する
4. 不要な branch を削除する
5. 必要なら余っている worktree を削除する
6. 後始末を確認する

## 停止条件

- 未コミット変更があるのに `commit` / `stash` / `破棄` の方針が決まっていない
- 未 push commit を消す判断が未確定
- 何かのプロセスが対象 worktree を使用中で、安全に削除できない

## 出力

- 削除したローカル branch の一覧
- 閉じた worktree の path 一覧
- 削除前に行った整理内容
- 実行した主要コマンド
- 未実施の確認や残リスク
