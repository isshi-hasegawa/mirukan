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
  - recommendation 用スコア計算と TMDb 更新 payload 組み立ては `work-metadata.ts` へ分離済み
  - season / series upsert の既存判定・再同期・insert/update は共通 helper へ寄せ直した

## 優先度高: 追加フローの状態管理整理

- 対象
  - `src/features/backlog/components/AddModal.tsx`
  - `src/features/backlog/hooks/useTmdbSearch.ts`
  - `src/features/backlog/hooks/useAddSubmit.ts`
- 現状
  - TMDb 検索、シーズン選択、手動入力、submit orchestration の分離は進んだ
  - 残りは `useAddSubmit.ts` 内の保存分岐と「確認待ち」状態の扱いをどこまで明示化するか
- 分けたい責務
  - 検索結果一覧と選択 UI
  - TV シリーズのシーズン選択状態
  - 追加実行前の重複確認と submit orchestration
  - 手動入力フォーム
- 着手メモ
  - `AddModal` 自体は modal shell と左右ペイン構成に絞る
  - 検索結果 / おすすめ結果 / メッセージ取得は `useTmdbSearchRequest.ts` へ分離済み
  - 選択系 state は reducer 化し、手動入力 draft と submit message の橋渡しは `useAddFlow.ts` へ集約済み
  - AddModal の重複追加確認は browser confirm ではなく、追加時だけ確認パネルを出す仕様へ見直した
  - 事前の duplicate notice やキャンセル後メッセージは削除し、通常時は静かに選ばせる UI に寄せた
  - 次に触るなら `useAddSubmit.ts` 内の `TVシーズン追加` / `単体作品追加` / `確認待ち` の分岐を、過剰抽象化せずに整理できるかを見る
  - `TVシーズン追加` と `単体作品追加` の保存分岐は分けても自然だが、work / backlog 保存を汎用 helper 化しすぎるのは避けたい

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
  - `PlatformPicker` と note 編集の見た目責務は部品化した。次は必要なら status 行まで切り出す
  - `NoteEditor` 相当の切り出しは妥当
  - field ごとの細かすぎる部品分割は過剰になりやすいので避けたい

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
  - `useBoardPageController.ts` を追加し、`useBacklogItems` / `useBacklogActions` / `useBacklogDnd` / modal state を画面用途ごとに束ねた
  - `KanbanBoard` の mobile / desktop 描画は `MobileKanbanBoard.tsx` / `DesktopKanbanBoard.tsx` へ分離した
  - stacked 列専用の viewing mode 絞り込み UI は `ViewingModeFilter.tsx` へ分離した
  - `KanbanColumn` header の件数表示と追加ボタンは `KanbanColumnHeader.tsx` へ分離した
  - 次に見るなら `KanbanColumn` 本体の empty state / card list をさらに分ける必要があるかを判断する
  - ただし desktop / mobile を完全に別画面へ分けるほどの抽象化は今の規模では過剰

## 優先度中: UI から `window.alert` / `window.confirm` を追い出す

- 対象
  - `src/features/backlog/hooks/useBacklogActions.ts`
  - `src/features/backlog/hooks/useAddSubmit.ts`
  - そのほか backlog 操作フロー
- 現状
  - backlog 画面では UI overlay 経由の confirm / alert が入っている
  - ただし hook の既定実装にはまだ browser 標準 API が残っている
- 分けたい責務
  - ドメインロジック
  - 確認ダイアログの表示
  - toast / form message / error presentation
- 着手メモ
  - callback 注入での分離と `useBacklogFeedback.tsx` 導入までは完了
  - AddModal では `window.confirm` 依存を外し、モーダル内確認パネルへ置き換え済み
  - 次は `browserBacklogFeedback` を既定実装として残す必要がまだあるかを見直す
  - AddModal 以外の画面遷移や表示優先度を見ながら、通知の auto dismiss や queue 制御が要るかを判断する
  - confirm 文言組み立ては pure function のまま残す
  - UI 基盤への置き換えはリファクタリングとして妥当で、追加フロー整理と並行して進めやすい

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
  - ただし `useBacklogItems.ts` は現状かなり薄いため、これ以上の抽象化は優先度低

## 判断メモ

- 続ける価値が高い
  - `useAddSubmit.ts` の submit orchestration 整理
  - `DetailModal.tsx` の note / platform UI 切り出し
  - `window.alert` / `window.confirm` の UI 基盤移行
- 慎重に進める
  - `BoardPage.tsx` の layout 差分切り出し
- 今は止める
  - `useBacklogItems.ts` のさらなる抽象化
  - 汎用 repository 基盤化
  - field ごとの細かすぎる UI 部品分割
