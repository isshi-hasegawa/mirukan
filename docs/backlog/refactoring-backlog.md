# Refactoring Backlog

現状のコードベースを見て、責務分離や設計整理の余地がある未着手課題を残す。
機能追加やテスト追加とは切り分けて、設計上の負債を小さくする候補だけを扱う。

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
- 未着手メモ
  - `data.ts` 分割と合わせて repository 側へ寄せると整理しやすい
  - 将来的な realtime 対応や query 再利用の足場にもなる
  - ただし `useBacklogItems.ts` は現状かなり薄いため、これ以上の抽象化は優先度低

## 判断メモ

- 今は止める
  - `useBacklogItems.ts` のさらなる抽象化
  - 汎用 repository 基盤化
  - field ごとの細かすぎる UI 部品分割
