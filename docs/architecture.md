# Architecture

メディアバックログ管理 SPA（映画・TVシリーズの視聴管理）。React + Vite + Supabase + TMDb API。

## レイヤー構成

### エントリポイント

- `src/main.tsx` — React エントリポイント。`<App>` をレンダリングする。
- `src/App.tsx` — 認証状態管理。セッションに応じて `LoginPage` または `BoardPage` を表示する。

### `src/features/backlog/components/`

- `BoardPage.tsx` — ボード全体の状態管理（items・モーダル・ドラッグ）
- `KanbanBoard.tsx` — 5 列のカンバンボード
- `KanbanColumn.tsx` — 列単体（ドロップゾーン含む）
- `BacklogCard.tsx` — カード単体（ドラッグ対応）
- `AddModal.tsx` — 作品追加モーダル（TMDb 検索・手動入力）
- `DetailModal.tsx` — カード詳細・インライン編集モーダル
- `LoginPage.tsx` — ログインフォーム

### `src/features/backlog/`

- `types.ts` — 型定義（`BacklogItem`, `BacklogStatus`, `WorkSummary` など）
- `data.ts` — Supabase 操作（CRUD）、`sort_order` 計算
- `helpers.ts` — フォーム処理、検索テキスト生成
- `constants.ts` — ステータス／プラットフォームのラベルと表示順
- `data.test.ts` — ユニットテスト

### `src/lib/`

- `supabase.ts` — Supabase クライアント初期化
- `tmdb.ts` — TMDb API 統合（映画・TVシリーズ検索、シーズン取得）
- `env.ts` — 環境変数バリデーション

## データモデル

### 主要型

- `BacklogItem` — ユーザーのバックログ項目。`status`（5種）・`sort_order`・`display_title`・`primary_platform`・`note` を持ち、`works` に作品情報を JOIN する。
- `WorkSummary` — TMDb または手動登録の作品（映画・シリーズ・シーズン）
- `BacklogStatus` — `stacked` / `want_to_watch` / `watching` / `interrupted` / `watched`

## DB マイグレーション

- `supabase/migrations/` に SQL ファイルを追加して管理する。
- `supabase/seed.sql` はローカル開発用初期データとして扱う。
