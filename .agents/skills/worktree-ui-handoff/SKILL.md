---
name: worktree-ui-handoff
description: UI の動作確認が必要なときに使う。編集用 worktree の作業内容を既存 worktree で確認できるよう、現在の HEAD から確認用 branch を安全に作成し、既存 worktree をその branch に切り替える。
---

# Worktree UI Handoff

## 目的

編集作業は専用 worktree で進めつつ、普段使いの既存 worktree とブラウザ状態を維持したまま UI 確認できる状態へ切り替える。

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする
- 通常の作業開始は [`worktree-start`](../worktree-start/SKILL.md) に従い、この skill は UI 確認のための例外運用だけを扱う

## 対象

- source となる編集用 worktree / HEAD の確認
- target となる既存 worktree の特定
- target worktree の安全確認
- 確認用 branch 作成と切り替え

## 判断ルール

- ユーザーが「既存 worktree 側で UI 確認したい」と明示したときだけ使う
- source に未コミット変更がある場合は停止する
- target worktree が dirty なら停止する
- target 側では確認専用の派生 branch を作る
- 少しでも上書きや履歴破壊の危険がある場合は、新しい branch 名を作るか停止する

## 推奨手順

1. source worktree の branch 名と HEAD を確認する
2. source が clean で、確認したい内容がすべて commit 済みであることを確認する
3. target とする既存 worktree の path を確定する
4. target worktree が clean であることを確認する
5. source branch 名から確認用 branch 名を決める
6. target worktree で `git switch -c <target-branch> <source-head>` を実行する
7. target が source HEAD を指していることを確認する

## 停止条件

- source に未コミット変更がある
- target worktree を一意に決められない
- target worktree が dirty である
- target branch の再利用に履歴破壊や上書きの危険がある
- source HEAD を target へ安全に反映できない

## 出力

- source worktree の path / branch / commit
- target worktree の path
- 作成または再利用した確認用 branch 名
- target worktree が source HEAD を指していること
- 実行した主要コマンド
- UI 確認のため次に入るべき worktree と必要なコマンド
- 実施できなかったことや残リスク
