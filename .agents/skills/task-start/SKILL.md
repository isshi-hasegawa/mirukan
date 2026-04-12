---
name: task-start
description: 新しい作業を始めたいときに使う。最新の main から作業ブランチを作成し、画面確認が明らかに不要な並行作業でだけ worktree を使う。
---

# Task Start

## いつ使うか

- 新しい作業を始めるとき

## いつ使わないか

- 既に作業ブランチ上で作業中のとき
- 既存 open PR の追従をするとき

## 責務

- 新規作業を最新の `main` から始める
- 必要な場合だけ worktree と `vp install` を扱う

## 正本

- repo 共通ルールは `AGENTS.md` を正本とする
- 既存 PR の追従修正は [`pr-followup`](../pr-followup/SKILL.md) を正本とする

## 判断ルール

- 既存 open PR の追従は [`pr-followup`](../pr-followup/SKILL.md) で扱う
- 新規作業では本体側 `main` を `origin/main` に fast-forward で最新化してから branch を切る
- branch 名は `AGENTS.md` の命名規則に従う
- GitHub Issue URL / 番号が起点の作業では、Issue 本文と最新コメントを確認し、コメント反映後の確定スコープを整理してから branch を切る
- 画面確認やブラウザ操作での確認が明らかに必要な作業では、原則として現在の clone を使う
- 並行開発や隔離が必要で、かつ画面確認が明らかに不要な場合だけ worktree を作る
- 新しい作業場所で依存が未展開なら `vp install` を実行する

## 画面確認の要否分類

タスク内容から以下のシグナルで分類する。

不要（worktree OK）

- テスト追加・修正
- リファクタリング、型変更
- CI/CD、docs、skill 調整
- バックエンドロジック・データ処理・正規表現などの変換ロジック変更
- 依存バージョン更新

必要（clone を使う）

- UI コンポーネントの新規作成・変更
- CSS / スタイル / アニメーション変更
- 新ルート・ページ追加
- レスポンシブ対応
- `vp dev` で目視確認が前提と判断できる修正

不明なとき

- コンポーネントの「バグ修正」など、見た目への影響が不明なケース
- タスク説明が曖昧でスコープが確定できないケース

→ 「このタスク、UI の目視確認は必要ですか？」とユーザーに確認してから進む

## 手順

1. 現在の clone / branch / status を確認する
2. `git fetch origin` で `origin/main` を確認できる状態にする
3. GitHub Issue URL / 番号が起点なら、Issue 本文と最新コメントを確認し、「Issue 本文の要点」と「コメント反映後の確定スコープ」を整理する
4. 既存 open PR の追従なら、この skill を止めて [`pr-followup`](../pr-followup/SKILL.md) に切り替える
5. `main` を最新化する
6. タスク内容から「画面確認の要否分類」に従い worktree を使うかを決める。不明ならユーザーに確認する
7. ブランチ名を決める
8. 画面確認が必要、または worktree が不要な作業なら `git switch -c <branch>` で現在の clone に作業ブランチを作る
9. 並行開発や隔離が必要で、かつ画面確認が不要と判定された作業なら `git worktree add -b <branch> <path> main` で worktree ごと作業ブランチを作る
10. 作業場所の依存が未展開なら `vp install` を実行する

## 停止条件

- 新規作業か既存 open PR の追従かを判断できない
- GitHub Issue 起点なのにコメント確認前後の差分を整理できない
- `main` を最新化する場所を安全に確保できない
- `main` の最新化に失敗する
- 新しい branch 名を安全に決められない
- 既存 branch / worktree と衝突して上書きの危険がある
- 画面確認の要否から見て、現在の clone と worktree のどちらを使うべきか整理できない
- `vp install` が必要だが失敗して作業開始状態にできない

## 出力

- 採用した branch 名
- 使用する作業場所
- 新規開始として扱ったか、または `pr-followup` へ切り替えたか
- GitHub Issue 起点なら、「Issue 本文の要点」と「コメント反映後の確定スコープ」
- 実行した主要コマンド
- `vp install` の実施有無
- 未実施の確認や残リスク
