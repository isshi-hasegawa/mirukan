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
  - coverage をもとに未検証の分岐を継続的に埋める
- 見たい観点
  - `useAddSubmit.ts` の送信失敗系・分岐の穴
  - `useTmdbSearch.ts` の検索 / 重複判定 / TV シーズン分岐の穴
  - `data.ts` の未到達分岐
  - `BacklogCard.tsx` / `BoardPage.tsx` / `SeasonPicker.tsx` / `TmdbWorkCard.tsx` の UI 分岐
  - `AboutDialog.tsx` / `UserMenu.tsx` / `PlatformIcon.tsx` の低カバレッジ部分
- 関連 idea
  - `docs/ideas/tooling-ideas.md` の「Vitest Coverage」
