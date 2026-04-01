# Ops TODO

依存管理、Lint / CI、pre-commit、セキュリティ、開発体験の改善候補を置く。
ローカル運用と CI 運用の両方に効く改善案を、導入判断用の材料として残す。

## 開発運用・可視化

### リリース後の CI 自動実行再開

- 目的
  - 直接 `main` へ push している期間だけ止めた GitHub Actions の自動実行を、リリース後に戻す
- 再開方針
  - `.github/workflows/ci.yml` の `on:` を `workflow_dispatch` のみから戻す
  - `pull_request` では `vp check` と `vp test` を実行する
  - `main` への `push` では `vp build` と coverage 収集も実行する
  - `.github/workflows/secret-scan.yml` も `pull_request` / `push` で自動実行に戻す
- 判断メモ
  - 現在はリリース前で `main` へ直接 push するため、CI 待ちで手を止めないことを優先して手動実行にしている
  - 運用を戻すタイミングで、不要に重い job がないかだけ再確認する

### Renovate 導入検討

- 目的
  - 依存更新を自動で PR 化する
- 運用メモ
  - メジャー更新は分ける
  - テスト系とビルド系はまとめ方を調整する
  - CI が整ってから入れると効果が大きい

### `rollup-plugin-visualizer` 導入検討

- 目的
  - バンドルサイズを可視化する
- 見たい観点
  - `@supabase/supabase-js`
  - icon / UI 系依存
  - ルート初期表示に不要なコードが混ざっていないか
