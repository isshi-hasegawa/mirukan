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

### Vercel ビルドエラー修正・本番デプロイ

- 型エラー・未使用変数をテストファイル含め全修正
- Vercel プロジェクト作成・GitHub 連携済み
- カスタムドメイン `mirukan.app` / `www.mirukan.app` を Vercel に割り当て済み
- Cloudflare DNS 設定済み（A レコード・CNAME）
- 環境変数設定済み（`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`）
- 本番デプロイ成功（2026-04-04）

## 公開前に固めること

### Auth / 確認メール設定の最終確認

- 本番 URL：`https://mirukan.app`（デプロイ済み）
- まずやること
  - 本番 Supabase の `SITE_URL` を `https://mirukan.app` に設定する
    → ダッシュボード: Authentication → URL Configuration
    → `https://supabase.com/dashboard/project/gkjrgrexttthksjvbdjp/auth/url-configuration`
  - Redirect URLs に `https://mirukan.app` を追加する（同上）
  - 確認メールテンプレート（日本語）は `supabase/templates/` に作成済み。本番への反映は `supabase push` または手動適用が必要

### リリース前 QA と回帰確認

- まずやること
  - 本番相当環境で、ログイン、作品追加、詳細編集、カラム移動、TMDb 検索を手動確認する
  - モバイル表示で致命的な崩れがないかを確認する
