---
name: issue-open
description: 新規アイデアを discovery / implementation Issue として起票し、既存 discovery Issue の implementation 昇格まで扱う。
---

# Issue Open

## いつ使うか

- 新しいアイデアを GitHub Issue として起票したいとき
- 既存 Issue が discovery のままで、implementation に進めるか整理したいとき
- discovery Issue を implementation に昇格したいとき

## いつ使わないか

- すでに `implementation` ラベルが付き、実装範囲と完了条件が固まっているとき
- コード変更や PR 作成そのものが目的のとき

## 責務

- アイデアや議論ログを元に、Issue 本文を discovery / implementation のどちらかとして整形する
- discovery から implementation へ昇格できる条件を整理する
- 既存 Issue を昇格させる場合は、本文補足・ラベル変更・昇格コメントまで一貫して扱う

## 判断ルール

- まだ「本当に作るべきか」が固まっていない場合は `discovery` にする
- 必要性・最小スコープ・完了条件が揃った場合だけ `implementation` にする
- discovery と implementation は別 Issue に分けず、同一 Issue を育てる
- `implementation` にするなら、Codex にそのまま渡せる粒度まで具体化する
- 反対意見、採用条件、最小案を省略しない

## 手順

1. 対象が新規起票か、既存 Issue の更新かを確認する
2. アイデア、コメント、関連ログから「目的」「解決したい問題」「懸念」を整理する
3. discovery / implementation のどちらに置くか判断する
4. 以下のテンプレートで本文を作る
5. 新規起票なら、適切なラベルを付けて Issue を作る
6. 既存 discovery Issue を implementation に昇格するなら、本文に昇格後の前提を追記する
7. 昇格時はラベルを `discovery` から `implementation` に切り替え、昇格コメントを追加する

## discovery / implementation の判断基準

### discovery にする

- 必要性がまだ仮説段階
- 既存 UI / 運用で代替できる可能性が残っている
- 実装案より先に、反対意見や採用条件を詰めるべき

### implementation にする

- 何を実装し、何をやらないかが明確
- 最小案に圧縮できている
- 完了条件がそのまま実装タスクの受け入れ条件になる

## Issue 本文テンプレート

```md
## 目的

-

## 解決したい問題

-

## 期待する効果

-

## 懸念・反対意見

-

## 採用条件

-

## 実装する場合の最小案

-

## 完了条件

-
```

## implementation 追記テンプレート

implementation に進めるときは、必要に応じて以下も補う。

```md
## 実装タスク

- [ ]

## 非対象

-
```

## 昇格コメントテンプレート

```md
## 昇格理由

- discovery の議論で必要性と採用条件が固まった
- implementation として着手できる最小スコープが明確になった

## discovery 段階で整理したこと

- 反対意見:
- 採用条件:
- 最小案:

## implementation として扱う範囲

- 今回やること:
- 今回やらないこと:
```

## 出力

- 起票または更新した Issue の種別（discovery / implementation）
- 本文に反映した要点
- 昇格時は、追加した昇格コメントと変更したラベル
