---
name: worktree-ui-handoff
description: UI の動作確認が必要なときに使う。編集用 worktree の作業内容を既存 worktree で確認できるよう、現在の HEAD から確認用 branch を安全に作成し、既存 worktree をその branch に切り替える。
---

# Worktree UI Handoff

## 目的

編集作業は専用 worktree で進めつつ、普段使いの既存 worktree とブラウザ状態を維持したまま UI 確認できる状態へ安全に切り替える。

## 対象

この skill は次の作業を扱う。

- source となる編集用 worktree / branch / HEAD の確認
- target となる既存 worktree の特定
- target worktree の作業状態の安全確認
- source HEAD を基準にした確認用 branch 名の決定
- target worktree での確認用 branch 作成と切り替え
- 実行結果と、次に UI 確認する場所の整理

## 正本

- リポジトリ固有の運用ルールは `AGENTS.md` を正本とする
- 通常の作業開始は `worktree-start` に従い、この skill は UI 確認のための例外運用だけを扱う

## 利用ツール

- 状態確認と branch / worktree 操作には `git` コマンドを使う
- 依存や開発サーバーの操作が必要なら `vp` を使う
- `pnpm` / `npm` は使わない

## 前提ルール

- この skill は、ユーザーが「既存 worktree 側で UI 確認したい」と明示したときだけ使う
- source worktree には編集結果があり、target worktree は UI 確認用に使う
- 同じ branch は複数 worktree で同時 checkout できないため、target 側では確認専用の派生 branch を作る
- target worktree に未コミット変更がある場合は、自動で退避・破棄しない
- 自動 merge や競合解消は行わない
- `main` を確認用 branch の代わりに使わない

## 実行前チェック

1. `git rev-parse --show-toplevel` で source worktree を確認する
2. `git branch --show-current` で source branch を確認する
3. `git rev-parse HEAD` で source HEAD を確認する
4. `git status --short --branch` で source worktree の未コミット変更有無を確認する
5. `git worktree list --porcelain` で target 候補の既存 worktree を確認する
6. target worktree で `git status --short --branch` を確認する
7. target worktree の現在 branch が今回の確認を妨げないか確認する

## 判断ルール

- source に未コミット変更がある場合は、そのままでは target に正確に移せないため停止する
- target worktree が dirty なら停止する
- target worktree が `main` でも構わないが、確認時には `main` から確認用 branch へ切り替える
- target branch 名は source branch を元にしつつ、確認用であることが分かる接尾辞を付ける
- 既定の branch 名は `<source-branch>-ui-check` を優先する
- 既存 branch 名と衝突する場合は `<source-branch>-ui-check-2` のように衝突回避する
- 既存の確認用 branch がすでにあり、target worktree でのみ使われていて fast-forward 可能な場合だけ再利用を検討する
- 少しでも上書きや履歴破壊の危険がある場合は、新しい branch 名を作るか停止する

## 推奨手順

1. source worktree の branch 名と HEAD を確認する
2. source が clean で、確認したい内容がすべて commit 済みであることを確認する
3. target とする既存 worktree の path を確定する
4. target worktree が clean であることを確認する
5. source branch 名から確認用 branch 名を決める
6. target worktree で、その branch 名が未使用か確認する
7. 未使用なら `git switch -c <target-branch> <source-head>` を実行する
8. 既存 branch を再利用する場合は、その branch が安全に扱える条件を満たすか確認してから切り替える
9. target worktree で `git rev-parse HEAD` を確認し、source HEAD と一致することを確認する
10. 必要なら target worktree で `vp dev` など UI 確認に必要な手順を案内する

## branch 名の方針

- source が `fix/header-layout` なら target は `fix/header-layout-ui-check` を優先する
- source が `feat/123-season-support` なら target は `feat/123-season-support-ui-check` を優先する
- `ui-check` は確認用途であることが分かる最小限の接尾辞として扱う
- source branch 名自体は変更しない

## target worktree の選び方

- ユーザーが既存 worktree を指定した場合はそれを優先する
- 指定がない場合は、普段 UI 確認に使っている既存 worktree を候補にする
- 候補が複数あり、どれが普段使いか判断できない場合は停止する

## 停止条件

次の場合は自動で進めず停止する。

- source に未コミット変更がある
- target worktree を一意に決められない
- target worktree が dirty である
- target branch の再利用に履歴破壊や上書きの危険がある
- source HEAD を target へ安全に反映できない
- UI 確認に必要な worktree かどうかをユーザーが明示していない

## 出力

完了後は次を報告する。

- source worktree の path / branch / commit
- target worktree の path
- 作成または再利用した確認用 branch 名
- target worktree が source HEAD を指していること
- 実行した主要コマンド
- UI 確認のため次に入るべき worktree と必要なコマンド
- 実施できなかったことや残リスク
