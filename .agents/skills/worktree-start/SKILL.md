---
name: worktree-start
description: 作業を始めたいときに使う。現在の worktree とブランチが継続作業に使えるかを判定し、必要なら最新の main から作業ブランチと専用 worktree を作成し、依存未展開なら `vp install` を実行する。
---

# Worktree Start

## 目的

新規作業または既存作業の継続を、リポジトリ運用ルールに沿って開始できる状態へ整える。

## 対象

この skill は次の作業を扱う。

- 現在位置の worktree / branch の確認
- 継続作業か新規作業かの判定
- 本体側 `main` の確認と最新化
- ブランチ名の決定
- 作業ブランチの作成
- 専用 worktree の作成または既存 worktree の再利用
- 新しい worktree で依存未展開なら `vp install` を実行

## 正本

- リポジトリ固有の運用ルールは `AGENTS.md` を正本とする
- branch / worktree 運用は `AGENTS.md` の作業開始手順とブランチ命名に従う

## 利用ツール

- 状態確認と worktree / branch 操作には `git` コマンドを使う
- 依存展開には `vp install` を使う
- `pnpm` / `npm` は使わない

## 前提ルール

- 新しい作業は最新の `main` を基準に始める
- `main` のまま編集やコミットをしない
- 継続作業なら既存の専用 worktree / branch を優先する
- 別作業になった場合のみ新しい branch と worktree を作る
- ブランチ名は作業開始時点の内容で決め、途中で多少内容が変わっても原則変えない
- ブランチ名は `type/<issue-number>-<slug>` または `type/<slug>` の形式にする
- worktree のパスは本体リポジトリ名とブランチスラッグが対応する形を優先する

## 実行前チェック

1. `git rev-parse --show-toplevel` で現在位置を確認する
2. `git branch --show-current` で現在 branch を確認する
3. `git worktree list --porcelain` で既存 worktree 一覧を確認する
4. `git status --short --branch` で現在の作業状態を確認する
5. いまの worktree / branch が今回の継続作業に使えるか判定する
6. 新規作業なら、Issue 番号や依頼内容から branch 名候補を決める
7. 本体側 `main` worktree がどこか確認する

## 判断ルール

- 現在の worktree / branch が今回の継続作業専用なら、そのまま使う
- 現在 branch が `main` なら、新規作業開始とみなす
- 無関係な branch、すでに merge 済みの branch、共有中の worktree なら新規作業開始とみなす
- 新規作業では本体側 `main` を `origin/main` に fast-forward で最新化してから branch を切る
- 既存 branch があり、その branch 用 worktree がすでにあるなら再利用を優先する
- branch 名は Issue があれば番号を含め、なければ依頼内容の短い slug を使う
- slug は英小文字と `-` を基本にする
- 新しい worktree で `node_modules` など依存が未展開なら `vp install` を実行する

## 推奨手順

1. 現在の worktree / branch / status を確認する
2. 継続作業なら、その worktree を今回の作業場所として確定する
3. 新規作業なら、本体側 `main` worktree に移動する
4. `git fetch origin` を実行する
5. `origin/main` に差分があれば `git pull --ff-only origin main` で最新化する
6. `AGENTS.md` と対象 Issue または依頼内容を確認する
7. ブランチ名を決める
8. `git switch -c <branch>` で新しい作業ブランチを作る
9. `git worktree add <path> <branch>` で専用 worktree を作る
10. 新しい worktree に移動する
11. 依存が未展開なら `vp install` を実行する
12. 以後の調査や実装はその worktree で行う

## ブランチ名の決め方

- Issue がある場合は `type/<issue-number>-<slug>` を使う
- Issue がない場合は `type/<slug>` を使う
- `type` は `feat` `fix` `chore` `docs` `refactor` `test` `ci` など、作業の主目的に合わせる
- slug は 2 語から 5 語程度で、作業内容が識別できる粒度にする
- 迷う場合は依頼内容の主語ではなく差分の主題で決める

## worktree パス方針

- 本体リポジトリが `/path/to/mirukan` なら、作業用 worktree は `/path/to/mirukan-<branch-slug>` を優先する
- `/` はパス名に使えないので、branch 名の `/` は `-` に置き換える
- 既存の同名 path がある場合は、その worktree が同じ branch を指すか確認して再利用する
- 競合する別用途の path がある場合は、別の安全な path を選ぶ

## 依存展開の扱い

- 新しい worktree に `node_modules` がない、または必要な生成物が未作成なら `vp install` を実行する
- 既存 worktree の継続で依存が揃っているなら再実行しない
- 依存展開に失敗した場合は、その時点のエラーを報告して停止する

## 停止条件

次の場合は自動で進めず停止する。

- 継続作業か新規作業かを判断できない
- 本体側の `main` worktree を特定できない
- `main` の最新化に失敗する
- 新しい branch 名を安全に決められない
- 既存 branch / worktree と衝突して上書きの危険がある
- `vp install` が必要だが失敗して作業開始状態にできない

## 出力

開始後は次を報告する。

- 採用した branch 名
- 使用する worktree の path
- 継続作業として再利用したか、新規作成したか
- 実行した主要コマンド
- `vp install` の実施有無
- 未実施の確認や残リスク
