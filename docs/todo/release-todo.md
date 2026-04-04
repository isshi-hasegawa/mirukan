# Release TODO

リリース判断、公開前チェック、公開直後の運用準備に関する未着手タスクを置く。
機能追加そのものではなく、公開できる状態へ持っていくための整理と判断を優先する。

## 完了済み（2026-04-04）

### 本番 Supabase プロジェクト構築

- プロジェクト ref: `gkjrgrexttthksjvbdjp`（Singapore）
- `supabase link` 済み
- `supabase db push` 済み（マイグレーション全9件適用）
- `supabase secrets set TMDB_API_KEY` 済み
- `supabase functions deploy` 済み（全5件: fetch-tmdb-season-options / similar / trending / work-details / search-tmdb-works）
- `config.toml` 修正済み（DB v17、テンプレートパス修正、無効キー削除）

### Vercel ビルドエラー修正

- `src/components/ui/dropdown-menu.tsx` — 未使用の `React` import 削除（TS6133）
- `src/features/backlog/add-submit-flow.test.ts` — `jpWatchPlatforms: []` をデフォルト追加（TS2322）

## 公開前に固めること

### Auth / 確認メール設定の最終確認

- 本番 URL：`https://mirukan.app`（2026-04-04 取得済み）
- まずやること
  - 本番 Supabase の `SITE_URL` を `https://mirukan.app` に設定する
    → ダッシュボード: Authentication → URL Configuration
    → `https://supabase.com/dashboard/project/gkjrgrexttthksjvbdjp/auth/url-configuration`
  - Redirect URLs に `https://mirukan.app` を追加する（同上）
  - 確認メールテンプレート（日本語）は `supabase/templates/` に作成済み。本番への反映は `supabase push` または手動適用が必要

### 本番ホスティング構成の確定

- 本番 URL：`https://mirukan.app`（取得済み、ホスティング未設定）
- 構成：フロントエンド = Vercel、バックエンド = Supabase（上記）
- まずやること
  - Vercel プロジェクトを作成し、GitHub リポジトリと連携する
  - カスタムドメイン `mirukan.app` を Vercel に割り当てる
  - Vercel の環境変数を設定する
    - `VITE_SUPABASE_URL` = `https://gkjrgrexttthksjvbdjp.supabase.co`
    - `VITE_SUPABASE_PUBLISHABLE_KEY` = ダッシュボードの anon/public キー（default）
      → `https://supabase.com/dashboard/project/gkjrgrexttthksjvbdjp/settings/api-keys`
  - ビルドコマンド: `pnpm run build`、出力ディレクトリ: `dist`

### リリース前 QA と回帰確認

- まずやること
  - 本番相当環境で、ログイン、作品追加、詳細編集、カラム移動、TMDb 検索を手動確認する
  - モバイル表示で致命的な崩れがないかを確認する
