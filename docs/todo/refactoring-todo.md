# Refactoring TODO

現状のコードベースを見て、整理余地がありそうな点を TODO として残す。

このドキュメントは「すぐ実装する項目一覧」ではなく、今後実際にやるかをユーザーが検討するためのメモ。
優先順位、効果、変更コストを見ながら着手判断する前提とする。
実施済みの項目は残さず、このドキュメントから削除して未実施の TODO のみを保つ。

## 追加でほしいテスト

### `DetailModal` の統合テスト

- 対象
  - `src/features/backlog/components/DetailModal.tsx`
- 追加で確認したい観点
  - ステータス変更
  - note 保存
  - platform 保存
  - `Escape` による編集キャンセル / モーダル close の分岐

### `RecommendModal` / `BoardPage` の挙動テスト

- 対象
  - `src/features/backlog/components/RecommendModal.tsx`
  - `src/features/backlog/components/BoardPage.tsx`
- 追加で確認したい観点
  - 推薦候補の除外条件
  - checked した作品の追加
  - 初回ロード
  - エラー表示
  - モバイル時のタブ遷移

### `data.ts` の非同期テスト

- 対象
  - `src/features/backlog/data.ts`
- 現状
  - pure function まわりのユニットテストは追加済み
- 追加で確認したい観点
  - `resolveSelectedSeasonWorkIds`
  - `upsertBacklogItemsToStatus`
  - `upsertManualWork`
  - 競合時、途中失敗時、空入力時の扱い

### `tmdb.ts` の API 境界テスト追加

- 対象
  - `src/lib/tmdb.ts`
- 現状
  - `resolveSeasonTitle` と recommendation cache 周辺はテスト追加済み
- 追加で確認したい観点
  - `searchTmdbWorks`
  - `fetchTmdbSeasonOptions`
  - `fetchTmdbWorkDetails`
  - watch provider の正規化
  - 日本公開判定

## セキュリティ関連

### TMDb API キーの秘密管理（**優先度: 高**）

- **現状の問題**
  - `VITE_TMDB_API_KEY` が `src/lib/env.ts` で定義され、クライアント側で直接 TMDb API にリクエストを送信
  - Vite の `VITE_*` プレフィックスが付いた環境変数はビルド時にバンドルされ、ブラウザで確認可能になる
  - `console.log(import.meta.env.VITE_TMDB_API_KEY)` でクライアントコードから API キーが読み取られる可能性
  - API キーが URL クエリパラメータとして送信される

- **セキュリティリスク**
  - API キーの露出 → 悪意のある第三者による不正利用、API 課金の乱用
  - リクエストの追跡 → ユーザーの検索パターンが記録される可能性
  - 無制限な利用 → サーバー側でリクエスト制限ができない

- **改善方法**
  - Supabase Edge Functions を使用して、サーバー側で TMDb API リクエストをラップ
  - API キーは `SUPABASE_SECRET_*` または サーバー環境変数として管理
  - クライアント → Edge Function → TMDb API の構成に変更
  - Edge Functions で認証チェック、レート制限、キャッシュを実装可能

- **実装ステップ（案）**
  1. `supabase/functions/` に TMDb API ラッパー関数を作成
     - `search-tmdb-works`
     - `fetch-tmdb-work-details`
     - `fetch-tmdb-trending`
     - `fetch-tmdb-season-options`
  2. `src/lib/tmdb.ts` から fetch 処理を削除、Edge Functions の呼び出しに変更
  3. `.env.local` や Supabase ダッシュボードで `TMDB_API_KEY` を設定
  4. クライアント側の環境変数から `VITE_TMDB_API_KEY` を削除

- **参考資料**
  - [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
  - [TMDb API](https://developer.themoviedb.org/docs)

### シークレット検出ツールの導入検討

- **目的**
  - API キー、認証トークン、パスワードなど機密情報の漏洩を自動検出
  - Git コミット前、CI/CD パイプラインで検出
  - VITE\_ プレフィックスに機密情報が含まれていないことを保証

- **検討対象ツール**

  | ツール                                                      | 用途                 | 特徴                                                          |
  | ----------------------------------------------------------- | -------------------- | ------------------------------------------------------------- |
  | [Betterleaks](https://appsecsanta.com/betterleaks)          | Git history スキャン | オープンソース、2026年2月公開、98.6% recall、BPE tokenization |
  | [Gitleaks](https://github.com/gitleaks/gitleaks)            | Git history スキャン | 軽量、CI/CD 統合容易、GitHub Actions 対応                     |
  | [TruffleHog](https://github.com/trufflesecurity/trufflehog) | 包括的スキャン       | 700+ 認証器パターン、実検証機能、誤検削減                     |
  | ESLint + `eslint-plugin-security`                           | コード静的解析       | IDE 統合、開発時リアルタイム検出                              |

- **推奨導入順序（案）**
  1. **Gitleaks** を pre-commit hook に追加（軽量、すぐ効果）
  2. **ESLint セキュリティプラグイン** をローカル開発環境に追加
  3. **CI/CD パイプライン** で追加スキャン（GitHub Actions など）
  4. 必要に応じて TruffleHog への upgrade 検討

- **実装時の確認項目**
  - Vite ビルド後のバンドルファイルに秘密情報が含まれていないか
  - `.env.local` が `.gitignore` に含まれているか
  - 過去のコミット履歴に漏洩がないか確認
  - パッケージスクリプト（`vp` 経由）でのスキャン自動化

## 進め方の候補

1. まずはテスト追加だけやる
2. 小さい整理だけ先にやる
3. `AddModal` / `BoardPage` の分割まで含めて進める

どこまで実際に着手するかは、ユーザーが直近の開発計画と変更コストを見て判断する。
