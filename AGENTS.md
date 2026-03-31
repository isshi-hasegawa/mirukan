# 開発ルール

- 依存追加・削除や各種実行は `pnpm` や `npm` ではなく `vp` を使う。
- 変更前後で必要なテストの有無を確認し、未整備なら過剰でない範囲で追加する。
- `vp check --fix` は pre-commit で実行されるため、作業完了時に手動では実行しない。
- 変更後はコミットまで行い、pre-commit の通過を確認する。
- pre-commit で自動修正できないエラーが出た場合は、その内容を修正して再コミットする。
- `vp check` / `vp check --fix` を手動実行するのは、ユーザーが明示的に要求した場合、またはコミット失敗時の原因切り分けが必要な場合に限る。
- 依存追加・削除、リファクタリング、ファイル削除の変更では `vp run knip` の実行を検討し、未使用 export / file / dependency が増えていないか確認する。
- テストがある変更では、関連する `vp test` を実行する。範囲が判断しづらい場合は `vp test` を実行する。
- 変更後は適切な単位でコミットする。
- コミットメッセージは Conventional Commits の接頭辞を付け、日本語の体言止めにする。
- コミットメッセージの例: `feat: シーズン追加対応の実装`, `fix: シーズンタイトル補正の修正`

# コマンド

```bash
vp dev          # 開発サーバー起動
vp build        # 本番ビルド（型チェック込み）
vp preview      # 本番ビルドのプレビュー
vp check        # Lint（型チェックあり）
vp check --fix  # Lint + 自動修正
vp run knip     # 未使用 export / file / dependency の検知
vp test         # テスト全件実行
vp test src/features/backlog/data.test.ts  # 特定ファイルのテスト実行
```

`vp` は vite-plus (`@voidzero-dev/vite-plus-core`) が提供するカスタム CLI。`pnpm` / `npm` の代わりに使う。

# タスク運用

- 作業開始時は `AGENTS.md` を正として確認し、必要に応じて `docs/README.md` を見て `docs/` の分類と対象ファイルを把握する。
- `docs/todo/` は未着手または明確に保留中の実行候補を置く場所として扱い、完了済み・不要・現状と乖離した項目は残さない。
- `docs/ideas/` は未確定の案、比較検討中の方針、設計メモを置く場所として扱い、明示的な依頼や合意なしに採用案を確定しない。
- ユーザー依頼に応じて、着手前に関連するカテゴリの TODO だけを確認する。
- 機能追加・UX 改善では `docs/todo/feature-todo.md` を確認する。
- リファクタリング・責務整理・命名見直し・分割では `docs/todo/refactoring-todo.md` を確認する。
- テスト追加・テスト不足の補完・不具合修正に伴う検証追加では `docs/todo/test-todo.md` を確認する。
- 依存追加削除、Lint / CI、pre-commit、セキュリティ、開発体験改善では `docs/todo/ops-todo.md` を確認する。
- 関連するアイデアや設計メモがありそうな場合のみ `docs/ideas/` の該当ファイルも確認し、既存の論点や保留事項と矛盾しないように進める。
- TODO は実装の強制指示ではなく、既存の課題認識・保留論点・着手候補を確認するための資料として扱い、実際に着手する範囲はユーザー依頼を優先する。
- 作業中に着手済み・完了済み・前提崩れの項目が見つかったら、そのまま残さず今回の変更に合わせて TODO を更新する。
- 実装や調査で新しい未着手課題が見つかった場合のみ、適切なカテゴリの TODO に簡潔に追記する。
- 開発ルール、コマンド運用、確定済みの前提は `AGENTS.md` を正とし、`docs/` には補足情報・未着手課題・未確定メモを置く。

# アーキテクチャ概要

メディアバックログ管理 SPA（映画・TVシリーズの視聴管理）。React + Vite + Supabase + TMDb API。

## レイヤー構成

**`src/main.tsx`** — React エントリポイント。`<App>` をレンダリングする。

**`src/App.tsx`** — 認証状態管理。セッションに応じて `LoginPage` または `BoardPage` を表示。

**`src/features/backlog/components/`** — UI コンポーネント：

- `BoardPage.tsx` — ボード全体の状態管理（items・モーダル・ドラッグ）
- `KanbanBoard.tsx` — 5 列のカンバンボード
- `KanbanColumn.tsx` — 列単体（ドロップゾーン含む）
- `BacklogCard.tsx` — カード単体（ドラッグ対応）
- `AddModal.tsx` — 作品追加モーダル（TMDb 検索・手動入力）
- `DetailModal.tsx` — カード詳細・インライン編集モーダル
- `LoginPage.tsx` — ログインフォーム

**`src/features/backlog/`** — バックログ機能モジュール：

- `types.ts` — 型定義（`BacklogItem`, `BacklogStatus`, `WorkSummary` など）
- `data.ts` — Supabase 操作（CRUD）、sort_order 計算
- `helpers.ts` — フォーム処理、検索テキスト生成
- `constants.ts` — ステータス／プラットフォームのラベルと表示順
- `data.test.ts` — ユニットテスト

**`src/lib/`** — 共有ライブラリ：

- `supabase.ts` — Supabase クライアント初期化
- `tmdb.ts` — TMDb API 統合（映画・TVシリーズ検索、シーズン取得）
- `env.ts` — 環境変数バリデーション

## データモデル

- **BacklogItem** — ユーザーのバックログ項目。`status`（5種）・`sort_order`・`display_title`・`primary_platform`・`note` を持ち、`works` に作品情報を JOIN
- **WorkSummary** — TMDb または手動登録の作品（映画・シリーズ・シーズン）
- **BacklogStatus** — `stacked` / `want_to_watch` / `watching` / `interrupted` / `watched`

## デザインシステム

- **UI ライブラリ**: shadcn/ui を優先して活用する
- **ベースカラー**: グレー系
- **アクセントカラー**: オレンジ

コンポーネントの新規作成・修正時は、このテーマに従う。

## DB マイグレーション

`supabase/migrations/` に SQL ファイルを追加して管理。`supabase/seed.sql` はローカル開発用初期データ。
