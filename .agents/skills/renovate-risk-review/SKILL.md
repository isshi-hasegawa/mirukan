---
name: renovate-risk-review
description: Renovate の PR を見たいときに使う。Renovate の非 auto-merge 対象 PR について、PR URL または番号から GitHub 上の PR メタデータと diff を取得し、回帰リスク・運用リスク・未確認事項を整理した Markdown コメント案を作る。
---

# Renovate Risk Review

## 目的

Renovate が作成した non-automerge PR について、差分ベースのリスク評価コメント案を作る。

## 対象

この skill は次の作業を扱う。

- PR URL または PR 番号の解決
- Renovate PR かどうかの判定
- auto-merge 対象かどうかの判定
- PR メタデータの取得
- PR diff の取得
- 回帰リスク、運用リスク、未確認事項の整理
- GitHub コメントにそのまま貼れる Markdown の生成

## 正本

- リポジトリ固有の運用ルールは `AGENTS.md` を正本とする
- GitHub 上の PR 情報は GitHub MCP を正本とする
- リスク評価の観点は `.agents/skills/self-review/SKILL.md` のレビュー観点を踏襲する

## 利用ツール

- GitHub 上の PR 取得には GitHub MCP ツールを優先して使う
- ローカル checkout やテスト実行は原則不要
- 差分の補足確認が必要なときだけローカルの `git` を使う

## 前提ルール

- この skill は Renovate PR 専用とする
- 評価対象は auto-merge されない Renovate PR に限定する
- 評価根拠は PR の title、body、diff、必要なら file patch に限定する
- CI やテスト結果は、この skill では実行して取りに行かない
- 実施していない確認は、問題なしと扱わず未確認事項として明示する
- 断定できないものは推測で埋めず、根拠不足として書く
- 指摘の主眼は見た目より、依存更新や lockfile 更新による挙動の破壊、設定や型の互換性、運用上の影響に置く
- コメント案は日本語で出す

## 入力解決

- ユーザーが PR URL を渡した場合は、repo owner/name と PR 番号を抽出して使う
- ユーザーが PR 番号だけを渡した場合は、現在の repo を前提に解決する
- repo を特定できない場合は停止して確認を求める

## 対象判定

次を満たすものだけを評価対象とする。

- author が `renovate[bot]`
- PR 本文またはタイトルから Renovate PR と判断できる
- PR 本文に `**Automerge**: Enabled by config` がない

対象外の場合は、なぜ対象外かを短く説明して停止する。

## 実行前チェック

1. repo と PR 番号を確定する
2. PR の title、body、author、base/head、changed files 数を取得する
3. Renovate PR かどうかを確認する
4. auto-merge 対象かどうかを確認する
5. PR patch を取得する
6. 必要なら file 単位 patch を追加取得する

## 推奨手順

1. PR 識別子を解決する
2. GitHub MCP で PR metadata を取得する
3. Renovate PR かつ non-automerge かを判定する
4. GitHub MCP で PR patch を取得する
5. 更新された依存や lockfile の実体を読み取る
6. 依存更新によって壊れうる既存挙動を洗い出す
7. 設定、型、ビルド、ランタイム、外部 API 契約の各観点で波及影響を確認する
8. diff から読み取れないが重要な確認事項を未確認として列挙する
9. GitHub コメントに貼れる Markdown を作る

## レビュー観点

- ランタイム依存更新による既存挙動への影響
- ビルド、型、テスト基盤への副作用
- lockfile だけの差分でも、更新された実依存の意味を説明できるか
- peer dependency、transitive dependency、Node 要件の変化
- 既存コードが暗黙に依存していた挙動変更の可能性
- 変更量に対して未確認事項が多すぎないか

## コメント方針

- 出力は GitHub コメントにそのまま貼れる Markdown にする
- 冗長な前置きは避ける
- 根拠があるものと未確認のものを混ぜない
- 懸念が薄い場合でも、`低リスク` と書いたうえで確認漏れを残さない
- 依存更新 PR なので、必要なら「この差分だけでは判断できない確認」を明示する

## 推奨出力形式

```md
## リスク評価

### 要約

- 更新対象
- 全体のリスク水準

### 主なリスク

- リスク 1
- リスク 2

### 追加で見たい確認

- 未確認事項 1
- 未確認事項 2

### 残リスク

- マージ時点で残るかもしれない懸念
```

## 停止条件

次の場合は自動で完了扱いにせず停止する。

- repo または PR 番号を解決できない
- PR metadata または diff を取得できない
- Renovate PR ではない
- Renovate auto-merge 対象 PR である
- 差分が大きすぎて主題を安全に要約できない

## 出力

評価後は次を返す。

- GitHub コメント用 Markdown
- 必要なら、評価根拠にした更新依存や変更領域の短い補足
