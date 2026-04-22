# AGENTS

## 基本原則

- 依存追加・削除や各種実行は `pnpm` や `npm` ではなく `vp` を使う。
- 変更前後で必要なテストの有無を確認し、未整備なら過剰でない範囲で追加する。
- `vp check --fix` は pre-commit で実行されるため、作業完了時に手動では実行しない。
- 変更後はコミットまで行い、pre-commit の通過を確認する。
- pre-commit で自動修正できないエラーが出た場合は、その内容を修正して再コミットする。
- `vp check` / `vp check --fix` を手動実行するのは、ユーザーが明示的に要求した場合、またはコミット失敗時の原因切り分けが必要な場合に限る。
- 依存追加・削除、リファクタリング、export の移動、ファイル削除、モジュール分割では、原則 `vp run knip` を実行し、未使用 export / file / dependency が増えていないか確認する。
- TypeScript / TSX ファイル、型定義、`package.json`、`tsconfig*`、`vite.config*`、ビルド設定、テストコードの型に触れる変更では、`vp run build:analyze` の実行を検討し、PR の `analyze` job と同じ `tsc + analyze build` が通ることを確認する。
- PR で `analyze` / `knip` の CI 失敗を踏んだ場合は、修正前にローカルでも `vp run build:analyze` / `vp run knip` を再現し、解消を確認してから push する。
- テストがある変更では、関連する `vp test` を実行する。範囲が判断しづらい場合は `vp test` を実行する。
- `main` には直接コミットしない。
- 変更は作業ブランチ上でコミットし、PR 経由で `main` に取り込む。
- 変更後は適切な単位でコミットする。
- ユーザーが明示的に不要と言わない限り、変更作業はコミット後に PR 作成まで完了して終了する。
- `implementation` ラベルが付いていない Issue には、コーディングエージェントは着手しない。着手前の整理が必要な場合は `issue-open` を使う。
- GitHub Issue を起点に着手するときは、Issue 本文だけでなく最新コメントまで確認してから作業判断する。
- コメントに本文より新しい決定、昇格理由、スコープ変更がある場合はコメントを優先する。
- Issue 着手前に「Issue 本文の要点」と「コメント反映後の確定スコープ」を要約し、コメント未確認のまま branch 作成や実装開始に進まない。

## ブランチ命名

1. ブランチ名は `feat/...` `fix/...` `chore/...` `docs/...` `refactor/...` `test/...` `ci/...` などの種別を先頭に付ける。
2. Issue がある作業では `type/<issue-number>-<slug>`、Issue がない作業では `type/<slug>` の形式を使う。
3. ブランチ名は作業開始時点の内容に基づいて付け、作業途中で内容が多少変わっても原則として変更しない。別作業になった場合のみ新しい作業ブランチを作成する。

## 作業フロー

- Issue 整理: 実装前のアイデア整理や Issue 起票・昇格が必要なときは `issue-open` を使う。
- 作業開始: コード変更を始めるときは必ず `task-start` に従う。
- 実装後: 必ず `self-review` に従う。
- PR 作成: `self-review` 通過後、PR が未作成なら必ず `pr-open` に従う。
- PR 追従: レビュー指摘や CI 失敗への対応は `pr-followup` に従う。
- 後始末: `cleanup` に従う。

作業フローは `issue-open → task-start → self-review → pr-open → pr-followup → cleanup` を基本とする。

## Issue 管理

- `discovery` ラベルは、必要性や採用条件を整理中の Issue に付ける。
- `implementation` ラベルは、必要性が確認できており、コーディングエージェントへ渡せる粒度の Issue に付ける。
- discovery と implementation は別 Issue に分けず、同一 Issue を育てる。必要になったらラベルを `discovery` から `implementation` へ切り替える。
- 新規アイデアの起票や discovery から implementation への昇格には `issue-open` を使う。

## Skill の命名と構成

- 基本は「作業フロー」単位で切り、フロー上の位置が分かる名前にする。
- 流れは「開始 → 確認 → PR → 追従 → 後始末」に沿わせる。
- 対象限定 skill は例外として扱い、`<対象>-<操作>` の形式にする。

## コミット

1. コミットメッセージは Conventional Commits の接頭辞を付け、日本語の体言止めにする。
2. コミットメッセージの例: `feat: シーズン追加対応の実装`, `fix: シーズンタイトル補正の修正`

## 参照ドキュメント

- アーキテクチャとデータモデルは `docs/architecture.md` を参照する。
- UI ライブラリや見た目の方針は `docs/ui.md` を参照する。

## コマンド

```bash
vp dev          # 開発サーバー起動
vp build        # 本番ビルド
vp run build    # tsc + 本番ビルド
vp run build:analyze  # tsc + analyze build（PR の Bundle Analyze 相当）
vp preview      # 本番ビルドのプレビュー
vp check        # Lint（型チェックあり）
vp check --fix  # Lint + 自動修正
vp run knip     # 未使用 export / file / dependency の検知
vp test         # テスト全件実行
vp test src/features/backlog/data.test.ts  # 特定ファイルのテスト実行
```

`vp` は vite-plus (`@voidzero-dev/vite-plus-core`) が提供するカスタム CLI。`pnpm` / `npm` の代わりに使う。
