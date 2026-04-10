# Refactoring Backlog

定期的な refactoring 候補の棚卸しを GitHub Actions で行う。

## 初期スコープ

- 実行契機は GitHub Actions の `schedule` と `workflow_dispatch`
- データソースは SonarCloud のみ
- 対象ブランチは `main`
- 出力先は GitHub Issue 1 本
- Issue は毎回新規作成せず、同じ backlog issue を更新する

## この実装で集約する情報

- プロジェクト全体の SonarCloud 指標
  - `code_smells`
  - `sqale_index`
  - `duplicated_lines_density`
  - `duplicated_blocks`
  - `complexity`
  - `cognitive_complexity`
  - `ncloc`
- open / confirmed の code smell
- ファイル単位の静的シグナル
  - 長大ファイル
  - 複雑度が高いファイル
  - 重複率が高いファイル

## 優先度の扱い

- `すぐ直す`
  - SonarCloud 上の code smell のうち、修正コストが低く件数を減らしやすいもの
- `構造改善が必要`
  - 長大ファイル、高複雑度、高重複率のように局所修正ではなく構造改善が必要なもの
- `今は保留`
  - 今回の観測では候補に出たが、すぐ着手しないもの

優先度は人間が最終判断する。workflow 側は候補整理までを責務とし、自動で issue 分割や PR 作成までは行わない。

## 運用ルール

- 週 1 回実行する
- 同じ backlog issue を更新して issue の乱立を防ぐ
- issue 本文には、機械更新対象であることを示す hidden marker を含める
- 生成結果は GitHub Actions の job summary にも残す

## 初期スコープに含めないもの

- AI による自動修正
- 自動 PR 作成
- coverage / knip / lint の追加実行
- 複数 issue への自動分割

coverage や `knip` は将来追加候補とし、最初は SonarCloud だけで継続運用できる形を優先する。
