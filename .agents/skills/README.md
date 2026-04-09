# Skills

## 一覧と使う順序

通常の作業フローでは、以下の順序で skill を使う。

| 順序 | Skill                                     | 使う場面                            | 使わない場面                 |
| ---- | ----------------------------------------- | ----------------------------------- | ---------------------------- |
| 1    | [task-start](task-start/SKILL.md)         | 新規作業の開始、既存作業の継続      | 既に作業ブランチ上で作業中   |
| 2    | [self-review](self-review/SKILL.md)       | 実装完了後、コミットや PR 作成の前  | 差分がない、まだ実装途中     |
| 3    | [pr-open](pr-open/SKILL.md)               | PR の新規作成・更新                 | 差分の主題が複数に割れている |
| 4    | [pr-followup](pr-followup/SKILL.md)       | review 指摘対応、CI 失敗対応        | PR がまだ存在しない          |
| 5    | [branch-cleanup](branch-cleanup/SKILL.md) | 作業完了後の branch / worktree 整理 | 作業がまだ終わっていない     |

## 例外 skill

通常フローとは別系統で、特定の対象に限定して使う skill。

| Skill                                                 | 使う場面                                  | 使わない場面                            |
| ----------------------------------------------------- | ----------------------------------------- | --------------------------------------- |
| [renovate-risk-review](renovate-risk-review/SKILL.md) | Renovate の non-automerge PR のリスク評価 | 自作の PR、automerge 対象の Renovate PR |

## 命名規則

- 基本は「作業フロー」単位で切り、フロー上の位置が分かる名前にする
- 流れは **開始 → 確認 → PR → 追従 → 後始末** に沿わせる
- 対象限定 skill は例外として扱い、`<対象>-<操作>` の形式にする

## Skill 間の関係

```
task-start
  └→ (実装)
       └→ self-review ← pr-followup からも呼ばれる
            └→ pr-open ← pr-followup からも呼ばれる
                 └→ pr-followup (review / CI 対応)
                      └→ branch-cleanup

renovate-risk-review (独立・例外)
```

- `pr-followup` は修正後に `self-review` を実施し、PR 本文の補正が必要なら `pr-open` に接続する
- `renovate-risk-review` は通常フローに組み込まれず、Renovate PR 専用で独立して動く

## 今後の候補

- `issue-start` / `issue-refine`: Issue から作業ブランチ名・実装方針・確認観点を整理する前段
- `release-check` / `deploy-check`: リリース前の確認をまとめる skill
