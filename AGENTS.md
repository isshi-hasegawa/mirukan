# 開発ルール

- 依存追加・削除や各種実行は `pnpm` や `npm` ではなく `vp` を使う。
- 変更前後で必要なテストの有無を確認し、未整備なら過剰でない範囲で追加する。
- 変更後は少なくとも `vp check` を実行する。
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
vp test         # テスト全件実行
vp test src/features/backlog/data.test.ts  # 特定ファイルのテスト実行
```

`vp` は vite-plus (`@voidzero-dev/vite-plus-core`) が提供するカスタム CLI。`pnpm` / `npm` の代わりに使う。

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
