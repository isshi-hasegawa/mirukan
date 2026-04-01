# Refactoring TODO

現状のコードベースを見て、責務分離や設計整理の余地がある未着手課題を残す。
機能追加やテスト追加とは切り分けて、設計上の負債を小さくする候補だけを扱う。

## 優先度中: backlog repository / util の仕上げ

- 対象
  - `src/features/backlog/backlog-repository.ts`
  - `src/features/backlog/work-repository.ts`
  - `src/features/backlog/backlog-item-utils.ts`
  - `src/features/backlog/viewing-mode.ts`
  - `src/features/backlog/*.test.ts`
- 現状
  - repository / pure util / viewing mode の分離は進み、`data.ts` barrel は削除済み
  - `data.test.ts` の責務分割も終わり、テストはモジュール単位へ寄せ直した
  - 残りは work repository 内の pure 計算と TMDb 同期責務の境界整理
- 分けたい責務
  - backlog item query definition / normalizer / React hook
  - backlog item 並び替え・更新ロジック
  - works テーブルの upsert と TMDb 同期
  - recommendation 用のスコア計算
- 着手メモ
  - hook から query 定義を追い出すところまでは着手済み
  - `data.test.ts` は backlog repository / backlog-item util / viewing mode / work repository の単位へ分割済み
  - internal import の `data.ts` barrel 経由は解消済みで、barrel 自体も削除済み
  - 次は recommendation 用スコア計算や TMDb 同期まわりの pure 部分をさらに分離できるか見直したい

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

## 優先度中: 詳細モーダルの編集 UI 部品化

- 対象
  - `src/features/backlog/components/DetailModal.tsx`
- 現状
  - 更新 action 自体は hook へ寄せ始めた
  - ただし note 編集 UI と platform picker は modal 内に残っている
- 分けたい責務
  - editable field ごとの save / cancel 制御
  - modal の表示ロジック
- 着手メモ
  - `useDetailModalActions` で更新処理はまとめたので、次は inline editor の部品化可否を確認する
  - `PlatformPicker` と note 編集の見た目責務まで薄くできると modal 本体がさらに読みやすい

## 優先度中: `BoardPage` の画面状態整理

- 対象
  - `src/features/backlog/components/BoardPage.tsx`
- 現状
  - items 読み込み
  - DnD 状態
  - modal 開閉
  - mobile tab 状態
  - 復帰時スクロール
  - 画面全体の orchestration が `BoardPage` に集まっている
- 分けたい責務
  - board shell
  - modal coordinator
  - layout ごとの差分処理
- 着手メモ
  - dragged card preview はコンポーネント化済み
  - modal 制御と追加後復帰処理は `useBoardPageState` へ切り出し済み
  - 次は layout ごとの差分描画を board shell から順に外したい
  - `useBacklogItems` / `useBacklogActions` / `useBacklogDnd` の戻り値を画面用途ごとに整理したい

## 優先度中: UI から `window.alert` / `window.confirm` を追い出す

- 対象
  - `src/features/backlog/hooks/useBacklogActions.ts`
  - `src/features/backlog/hooks/useAddSubmit.ts`
  - そのほか backlog 操作フロー
- 現状
  - callback 注入の入口は作ったが、既定実装はまだ browser 標準 API
  - UI と hook の境界は少し改善したが、shadcn/ui ベースの確認 UI には未移行
- 分けたい責務
  - ドメインロジック
  - 確認ダイアログの表示
  - toast / form message / error presentation
- 着手メモ
  - callback 注入での分離は着手済み
  - 次は confirm / alert を modal / toast ベースへ置き換える
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
