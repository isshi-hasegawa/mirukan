# Ops TODO

依存管理、Lint / CI、pre-commit、セキュリティ、開発体験改善候補を置く。

このドキュメントは「すぐ実装する項目一覧」ではなく、今後実際にやるかをユーザーが検討するためのメモ。
実施済みの項目は残さず、このドキュメントから削除して未実施の TODO のみを保つ。

## セキュリティ関連

### シークレット検出ツールの導入検討

- 目的
  - API キー、認証トークン、パスワードなど機密情報の漏洩を自動検出
  - Git コミット前、CI/CD パイプラインで検出
  - `VITE_` プレフィックスに機密情報が含まれていないことを保証

- 検討対象ツール

  | ツール                                                      | 用途                 | 特徴                                                          |
  | ----------------------------------------------------------- | -------------------- | ------------------------------------------------------------- |
  | [Betterleaks](https://appsecsanta.com/betterleaks)          | Git history スキャン | オープンソース、2026年2月公開、98.6% recall、BPE tokenization |
  | [Gitleaks](https://github.com/gitleaks/gitleaks)            | Git history スキャン | 軽量、CI/CD 統合容易、GitHub Actions 対応                     |
  | [TruffleHog](https://github.com/trufflesecurity/trufflehog) | 包括的スキャン       | 700+ 認証器パターン、実検証機能、誤検削減                     |
  | ESLint + `eslint-plugin-security`                           | コード静的解析       | IDE 統合、開発時リアルタイム検出                              |

- 推奨導入順序案
  1. `Gitleaks` を pre-commit hook に追加
  2. `eslint-plugin-security` をローカル開発環境に追加
  3. GitHub Actions などの CI/CD パイプラインで追加スキャン
  4. 必要に応じて `TruffleHog` への upgrade を検討

- 実装時の確認項目
  - Vite ビルド後のバンドルファイルに秘密情報が含まれていないか
  - `.env.local` が `.gitignore` に含まれているか
  - 過去のコミット履歴に漏洩がないか確認する
  - パッケージスクリプトを `vp` 経由で実行できるようにする

## 開発運用・可視化

### TMDb の帰属表示・ロゴ掲載対応

- 背景
  - TMDb の `Logos & Attribution` と FAQ では、データや画像を利用するアプリは TMDb を出典として適切に帰属表示する必要がある
  - FAQ では `You shall use the TMDB logo` とされ、`About` または `Credits` 相当の画面に帰属表示を置くよう求めている
  - 現状のアプリに TMDb 帰属表示やロゴ掲載が十分に実装されているか未確認
- 確認・対応項目
  - `About` または `Credits` 相当の導線をどこに置くか決める
  - TMDb 指定の注意文言を表示する
  - TMDb 承認済みロゴのどれを使うか決める
  - ロゴの見せ方が自アプリの主ブランドより強くならないことを確認する
- 参照
  - https://www.themoviedb.org/about/logos-attribution
  - https://developer.themoviedb.org/docs/faq

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
