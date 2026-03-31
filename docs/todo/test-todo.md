# Test TODO

追加したいテスト、欠けている検証観点、テスト強化候補を置く。
既存カバレッジを踏まえて、次に埋めるべき抜けを優先度付きで残す。

既存テストの状況を見ると、`AddModal` と `data.ts` の pure function、`tmdb.ts` の recommendation cache / `resolveSeasonTitle` はすでに一定カバーされている。
次は UI の状態遷移と Supabase / TMDb 境界の非同期分岐を埋める優先度が高い。

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

## テスト基盤の拡張検討

### Playwright 活用範囲の拡張

- 目的
  - ログイン、作品追加、詳細編集、ドラッグ操作を含む主要フローの E2E 回帰を拾えるようにする
- まず見たい対象
  - ログイン後にボードが表示される
  - 作品追加モーダルから作品を追加できる
  - カード詳細を編集できる
  - カードを別カラムへ移動できる
- 関連 idea
  - `docs/ideas/tooling-ideas.md` の「Playwright」

### MSW 活用範囲の整理

- 目的
  - TMDb / Supabase まわりの API モックを共通化する
- まず見たい対象
  - TMDb 検索結果
  - シーズン一覧取得
  - backlog CRUD の成功系 / 失敗系
- 関連 idea
  - `docs/ideas/tooling-ideas.md` の「MSW」

### Vitest Coverage の運用整理

- 目的
  - 現在のテストの穴を見える化する
- 見たい観点
  - statements / branches の不足
  - 条件分岐の多い処理の穴
  - UI イベントの主要分岐が通っているか
- 関連 idea
  - `docs/ideas/tooling-ideas.md` の「Vitest Coverage」
