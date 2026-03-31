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

## 補足

- 補助ドキュメントは `docs/` にあります
- 開発ルールは `AGENTS.md` を参照してください
