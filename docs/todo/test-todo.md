# Test TODO

追加したいテスト、欠けている検証観点、テスト強化候補を置く。

このドキュメントは「すぐ実装する項目一覧」ではなく、今後実際にやるかをユーザーが検討するためのメモ。
実施済みの項目は残さず、このドキュメントから削除して未実施の TODO のみを保つ。

既存テストの状況を見ると、`AddModal` と `data.ts` の pure function、`tmdb.ts` の recommendation cache / `resolveSeasonTitle` はすでに一定カバーされている。
次は UI の状態遷移と Supabase / TMDb 境界の非同期分岐を埋める優先度が高い。

## 優先度高: `RecommendModal` / `BoardPage` の挙動テスト

- 対象
  - `src/features/backlog/components/RecommendModal.tsx`
  - `src/features/backlog/components/BoardPage.tsx`
- 追加で確認したい観点
  - 現状メモ
    - `RecommendModal` の主要分岐と `BoardPage` のロード / エラー / モバイル復帰 / 削除時モーダル close は追加済み
  - `BoardPage`
    - recommendation modal 自体の open / close 導線
    - desktop 時に追加完了後 / recommendation 追加後に `stacked` 列へ scroll する

## 優先度中: `data.ts` の非同期テスト

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

## 優先度中: `tmdb.ts` の API 境界テスト追加

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
