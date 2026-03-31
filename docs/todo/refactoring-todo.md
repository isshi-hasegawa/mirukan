# Refactoring TODO

現状のコードベースを見て、責務分離や設計整理の余地がある未着手課題を残す。
機能追加やテスト追加とは切り分けて、設計上の負債を小さくする候補だけを扱う。

## 優先度高: `data.ts` の責務分割

- 対象
  - `src/features/backlog/data.ts`
- 現状
  - backlog 並び替え
  - backlog upsert 計画
  - detail 更新用 helper
  - manual work 登録
  - TMDb work / season 同期
  - recommendation 用スコア計算
  - これらが 1 ファイルに同居している
- 分けたい責務
  - backlog item の並び替え・更新ロジック
  - works テーブルの upsert と TMDb 同期
  - recommendation 用のスコア計算
  - Supabase I/O を伴う repository 層
- 着手メモ
  - pure function と I/O 境界を先に分ける
  - `data.test.ts` が巨大化しやすいので、分割後の単位に合わせてテストも分ける

## 優先度高: 追加フローの状態管理整理

- 対象
  - `src/features/backlog/components/AddModal.tsx`
  - `src/features/backlog/hooks/useTmdbSearch.ts`
  - `src/features/backlog/hooks/useAddSubmit.ts`
- 現状
  - TMDb 検索、シーズン選択、重複判定、手動入力、submit 後の分岐が複数箇所に散っている
  - UI 上の見た目は分かれていても、追加フロー全体の state machine は見通しづらい
- 分けたい責務
  - 検索結果一覧と選択 UI
  - TV シリーズのシーズン選択状態
  - 追加実行前の重複確認と submit orchestration
  - 手動入力フォーム
- 着手メモ
  - `AddModal` 自体は modal shell と左右ペイン構成に絞る
  - 「検索選択状態」と「保存実行状態」を hook または reducer で明示化したい

## 優先度中: 詳細モーダルの更新処理共通化

- 対象
  - `src/features/backlog/components/DetailModal.tsx`
- 現状
  - status 更新
  - primary platform 更新
  - note 更新
  - 失敗時メッセージ反映
  - 楽観更新
  - これらの更新パターンがコンポーネント内に個別実装されている
- 分けたい責務
  - backlog item 更新 action
  - editable field ごとの save / cancel 制御
  - modal の表示ロジック
- 着手メモ
  - `useDetailModalActions` のような hook へ寄せるか、更新 action を汎用化する
  - `PlatformPicker` や note 編集の inline editor を部品化できるか確認する

## 優先度中: `BoardPage` の画面状態整理

- 対象
  - `src/features/backlog/components/BoardPage.tsx`
- 現状
  - items 読み込み
  - DnD 状態
  - modal 開閉
  - mobile tab 状態
  - 復帰時スクロール
  - DragOverlay 表示
  - 画面全体の orchestration が `BoardPage` に集まっている
- 分けたい責務
  - board shell
  - modal coordinator
  - dragged card preview
  - layout ごとの差分処理
- 着手メモ
  - 今すぐ大分割するより、overlay 表示と modal 制御から順に外す
  - `useBacklogItems` / `useBacklogActions` / `useBacklogDnd` の戻り値を画面用途ごとに整理したい

## 優先度中: UI から `window.alert` / `window.confirm` を追い出す

- 対象
  - `src/features/backlog/hooks/useBacklogActions.ts`
  - `src/features/backlog/hooks/useAddSubmit.ts`
  - そのほか backlog 操作フロー
- 現状
  - ユーザーフィードバックと確認 UI が browser 標準 API に直結している
  - hook の再利用性とテスト容易性を落としている
- 分けたい責務
  - ドメインロジック
  - 確認ダイアログの表示
  - toast / form message / error presentation
- 着手メモ
  - 最初は callback 注入で分離し、その後 shadcn/ui ベースの確認 UI へ寄せる
  - confirm 文言組み立ては pure function のまま残す

## 優先度低: backlog 取得クエリ定義の集約

- 対象
  - `src/features/backlog/hooks/useBacklogItems.ts`
  - backlog item 正規化処理
- 現状
  - `select(...)` の長い文字列と正規化知識が hook に埋まっている
  - 取得列の変更時に UI hook とデータ整形を同時に触る必要がある
- 分けたい責務
  - backlog item query definition
  - row normalizer
  - React hook 側の loading / error state
- 着手メモ
  - `data.ts` 分割と合わせて repository 側へ寄せると整理しやすい
  - 将来的な realtime 対応や query 再利用の足場にもなる
