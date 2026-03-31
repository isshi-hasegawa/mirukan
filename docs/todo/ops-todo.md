# Ops TODO

依存管理、Lint / CI、pre-commit、セキュリティ、開発体験の改善候補を置く。
ローカル運用と CI 運用の両方に効く改善案を、導入判断用の材料として残す。

## 開発運用・可視化

### Renovate 導入検討

- 目的
  - 依存更新を自動で PR 化する
- 運用メモ
  - メジャー更新は分ける
  - テスト系とビルド系はまとめ方を調整する
  - CI が整ってから入れると効果が大きい
- 関連 idea
  - `docs/ideas/tooling-ideas.md` の「Renovate」

### `rollup-plugin-visualizer` 導入検討

- 目的
  - バンドルサイズを可視化する
- 見たい観点
  - `@supabase/supabase-js`
  - icon / UI 系依存
  - ルート初期表示に不要なコードが混ざっていないか
- 関連 idea
  - `docs/ideas/tooling-ideas.md` の「rollup-plugin-visualizer」
