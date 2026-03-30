# Refactoring TODO

現状のコードベースを見て、整理余地がありそうな点を TODO として残す。

このドキュメントは「すぐ実装する項目一覧」ではなく、今後実際にやるかをユーザーが検討するためのメモ。
優先順位、効果、変更コストを見ながら着手判断する前提とする。

## 優先度高

### `BoardPage` の責務分割

- 対象
  - `src/features/backlog/components/BoardPage.tsx`
- 現状
  - データ取得
  - DnD 状態管理
  - 削除
  - 視聴済み化
  - おすすめ追加
  - モーダル開閉
  - モバイルタブ制御
  - 上記が 1 コンポーネントに集中している
- TODO
  - backlog 操作を hook / action 群へ分離する
  - DnD 判定ロジックを helper 化する
  - UI と Supabase 更新処理の境界を明確にする
- 着手判断メモ
  - 今後さらに機能追加するなら効果が大きい
  - 逆に直近で大きな追加予定がなければ後回しでもよい

### `AddModal` の分割

- 対象
  - `src/features/backlog/components/AddModal.tsx`
- 現状
  - 検索入力
  - trending 表示
  - 重複判定
  - TV シーズン選択
  - manual / TMDb の追加分岐
  - 追加後メッセージ
  - 上記を 1 ファイルで持っている
- TODO
  - TMDb 検索状態を hook 化する
  - シーズン選択 UI を小コンポーネントへ切り出す
  - 重複通知生成を pure function 化する
  - submit フローを action 化する
- 着手判断メモ
  - UI 仕様変更が多そうなら早めに整理したい
  - 追加フローが安定しているならテスト先行でもよい

### `DetailModal` の更新処理整理

- 対象
  - `src/features/backlog/components/DetailModal.tsx`
- 現状
  - ステータス変更
  - プラットフォーム更新
  - ノート更新
  - エラーメッセージ管理
  - これらをコンポーネントが直接 Supabase に依存して処理している
- TODO
  - 更新処理を `data.ts` か専用 action に寄せる
  - note / platform 保存の共通パターンをまとめる
  - state 復元ロジックの重複を減らす
- 着手判断メモ
  - 回帰を減らす目的なら優先度高
  - UI 改修だけならそのままでも進められる

## 優先度中

### 未使用コードの整理

- 候補
  - `src/components/ui/badge.tsx`
  - `src/components/ui/tabs.tsx`
  - `src/features/backlog/constants.ts` の `statusDescriptions`
  - `src/features/backlog/types.ts` の `DragState`
  - `src/features/backlog/helpers.ts` の一部関数
- TODO
  - 本番コードから未使用のものを確認して削除する
  - 将来使う予定があるなら意図が分かる置き方へ変える
- 着手判断メモ
  - 小さく安全に進めやすい
  - ただし shadcn 生成物は今後使う可能性もあるので即削除は要判断

### プラットフォーム表示ロジックの共通化

- 対象
  - `src/features/backlog/components/PlatformPicker.tsx`
  - `src/features/backlog/components/PlatformIcon.tsx`
- 現状
  - `platformBg` が重複している
- TODO
  - 共通定数へ移動する
  - アイコン表示コンポーネントの責務を整理する
- 着手判断メモ
  - 影響範囲が小さく、先にやってもよい

### 依存の棚卸し

- 候補
  - `@dnd-kit/sortable`
  - `@dnd-kit/utilities`
  - `shadcn`
- TODO
  - 実際に未使用か再確認する
  - 未使用なら削除、CLI 用なら `devDependencies` へ移す
- 着手判断メモ
  - すぐ効果は小さいが、依存の見通しはよくなる

## 明確に足りていないテスト

### `AddModal` の統合テスト

- 対象
  - `src/features/backlog/components/AddModal.tsx`
- 足りていない観点
  - 検索結果選択時の分岐
  - TV 選択時のシーズン初期選択
  - 重複通知
  - confirm キャンセル時の挙動
  - manual / TMDb の submit 分岐

### `DetailModal` の統合テスト

- 対象
  - `src/features/backlog/components/DetailModal.tsx`
- 足りていない観点
  - ステータス変更
  - note 保存
  - platform 保存
  - `Escape` による編集キャンセル / モーダル close の分岐

### `RecommendModal` / `BoardPage` の挙動テスト

- 対象
  - `src/features/backlog/components/RecommendModal.tsx`
  - `src/features/backlog/components/BoardPage.tsx`
- 足りていない観点
  - 推薦候補の除外条件
  - checked した作品の追加
  - 初回ロード
  - エラー表示
  - モバイル時のタブ遷移

### `data.ts` の非同期テスト

- 対象
  - `src/features/backlog/data.ts`
- 足りていない観点
  - `resolveSelectedSeasonWorkIds`
  - `upsertBacklogItemsToStatus`
  - `upsertManualWork`
  - 競合時、途中失敗時、空入力時の扱い

### `tmdb.ts` の API 境界テスト

- 対象
  - `src/lib/tmdb.ts`
- 足りていない観点
  - `searchTmdbWorks`
  - `fetchTmdbSeasonOptions`
  - `fetchTmdbWorkDetails`
  - watch provider の正規化
  - 日本公開判定

## 進め方の候補

1. まずはテスト追加だけやる
2. 小さい整理だけ先にやる
3. `AddModal` / `BoardPage` の分割まで含めて進める

どこまで実際に着手するかは、ユーザーが直近の開発計画と変更コストを見て判断する。
