# Refactoring TODO

現状のコードベースを見て、整理余地がありそうな点を TODO として残す。

このドキュメントは「すぐ実装する項目一覧」ではなく、今後実際にやるかをユーザーが検討するためのメモ。
優先順位、効果、変更コストを見ながら着手判断する前提とする。
実施済みの項目は残さず、このドキュメントから削除して未実施の TODO のみを保つ。

## 追加でほしいテスト

既存テストの状況を見ると、`AddModal` と `data.ts` の pure function、`tmdb.ts` の recommendation cache / `resolveSeasonTitle` はすでに一定カバーされている。
次は UI の状態遷移と Supabase / TMDb 境界の非同期分岐を埋める優先度が高い。

### 優先度高: `RecommendModal` / `BoardPage` の挙動テスト

- 対象
  - `src/features/backlog/components/RecommendModal.tsx`
  - `src/features/backlog/components/BoardPage.tsx`
- 追加で確認したい観点
  - 現状メモ
    - `RecommendModal` の主要分岐と `BoardPage` のロード / エラー / モバイル復帰 / 削除時モーダル close は追加済み
  - 追加で確認したい観点
    - `BoardPage`
      - recommendation modal 自体の open / close 導線
      - desktop 時に追加完了後 / recommendation 追加後に `stacked` 列へ scroll する

### 優先度中: `data.ts` の非同期テスト

- 対象
  - `src/features/backlog/data.ts`
- 現状
  - pure function まわりのユニットテストは追加済み
- 追加で確認したい観点
  - `resolveSelectedSeasonWorkIds`
    - 空入力時のエラー
    - シーズン情報組み立て失敗時のエラー
    - 途中の `upsertTmdbWork` 失敗時に workIds を返さず打ち切る
  - `upsertBacklogItemsToStatus`
    - 空入力または action なしの no-op
    - insert / move 混在時に `sort_order` を先頭から振る
    - upsert 失敗時にエラーを返す
  - `upsertManualWork`
    - 既存ヒット時の再利用
    - insert 成功
    - `23505` 競合後の再 select で救済
    - 競合後の再 select 失敗

### 優先度中: `tmdb.ts` の API 境界テスト追加

- 対象
  - `src/lib/tmdb.ts`
- 現状
  - `resolveSeasonTitle` と recommendation cache 周辺はテスト追加済み
- 追加で確認したい観点
  - `searchTmdbWorks`
  - `fetchTmdbSeasonOptions`
  - `fetchTmdbWorkDetails`
  - `supabase.functions.invoke` のエラーが例外化されること
- メモ
  - watch provider の正規化や日本公開判定のような整形ロジックは、現在の `src/lib/tmdb.ts` には見当たらない
  - それらが Supabase Edge Function 側にあるなら、クライアントではなく Function 側のテスト対象として切り分ける

## セキュリティ関連

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
