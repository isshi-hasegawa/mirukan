# mirukan

みるカンは、その時の自分に合う 1 本を決めるための、映像作品のバックログ兼意思決定アプリです。

## 概要

- 積んだ作品を整理する
- 次に見る作品を決めることに特化する

## 開発

このリポジトリではコマンド実行に `vp` を使います。

```bash
vp dev
vp build
vp check --fix
vp test
```

クライアント側の環境変数は `.env.example` を参照してください。

TMDb API キーはクライアントに置かず、Supabase Edge Functions の secret として設定します。

```bash
cp .env.example .env.local
cp supabase/functions/.env.example supabase/functions/.env
```

`supabase/functions/.env` にはローカル開発用の `TMDB_API_KEY` を設定してください。リモート環境は `supabase secrets set TMDB_API_KEY=...` で管理します。

## Supabase Edge Functions

TMDb 検索系の API は Supabase Edge Functions 経由で実行します。
関数コードを配置しただけでは動作しません。

### ローカル開発

フロントエンド用の環境変数と Edge Function 用の環境変数は別です。

- `.env.local`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- `supabase/functions/.env`
  - `TMDB_API_KEY`

ローカルで TMDb 検索を使うには、次の条件を満たす必要があります。

- フロントエンドがローカル Supabase を向いている
- ローカル Supabase が起動している
- Edge Functions が起動している
- `supabase/functions/.env` に `TMDB_API_KEY` が設定されている

`VITE_SUPABASE_URL` が `http://127.0.0.1:54321` を向いていれば、ローカル Supabase を使っています。

### リモート環境

ここでいうリモート環境は、ローカル PC 上ではない Supabase プロジェクト全般です。
本番環境に限らず、開発用・ステージング用のクラウド Supabase も含みます。

リモート環境を使う場合は、関数コードの配置だけではなく、secret 設定と関数の deploy が必要です。

```bash
supabase secrets set TMDB_API_KEY=...
supabase functions deploy search-tmdb-works
supabase functions deploy fetch-tmdb-season-options
supabase functions deploy fetch-tmdb-work-details
supabase functions deploy fetch-tmdb-trending
supabase functions deploy fetch-tmdb-similar
```

### トラブルシュート

- `Supabase function search-tmdb-works failed: Edge Function returned a non-2xx status code`
  - Edge Function が起動していない
  - フロントエンドの接続先 Supabase が想定と違う
  - `TMDB_API_KEY` が未設定
- `Missing authorization header`
  - Edge Function を直接叩いたが、Supabase の認証ヘッダーが付いていない
- `Missing environment variable: TMDB_API_KEY`
  - `supabase/functions/.env` または Supabase secrets に `TMDB_API_KEY` が設定されていない

## 補足

- 補助ドキュメントは `docs/` にあります
- 開発ルールは `AGENTS.md` を参照してください
