# Test TODO

追加したいテスト、欠けている検証観点、テスト強化候補を置く。
既存カバレッジを踏まえて、次に埋めるべき抜けを優先度付きで残す。

既存テストの状況を見ると、`AddModal` と `data.ts` の pure function、`tmdb.ts` の recommendation cache / `resolveSeasonTitle` はすでに一定カバーされている。
次は UI の状態遷移と Supabase / TMDb 境界の非同期分岐を埋める優先度が高い。

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

### 2026-04-01 時点の実測メモ

- `vp exec vitest --coverage` が実行可能な状態になった
- 全体 coverage は `statements 78.7% / branches 72.35% / functions 79.56% / lines 80.84%`
- 優先度高
  - `src/features/backlog/hooks/useAddSubmit.ts` の分岐追加
  - `src/features/backlog/hooks/useTmdbSearch.ts` の分岐追加
  - `src/features/backlog/data.ts` の未到達分岐追加
- 次点
  - `BacklogCard.tsx` / `BoardPage.tsx` / `SeasonPicker.tsx` / `TmdbWorkCard.tsx` の UI 分岐追加
  - `AboutDialog.tsx` / `UserMenu.tsx` / `PlatformIcon.tsx` の低カバレッジ部分の整理
- 補足
  - `assets/` 配下の SVG も集計対象に入っているため、必要なら coverage 対象から除外を検討する
