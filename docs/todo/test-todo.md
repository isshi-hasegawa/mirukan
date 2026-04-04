# Test TODO

追加したいテスト、欠けている検証観点、テスト強化候補を置く。
既存カバレッジを踏まえて、次に埋めるべき抜けを優先度付きで残す。

既存テストの状況を見ると、`AddModal` と backlog repository / util / viewing mode / work repository の pure function、`tmdb.ts` の recommendation cache / `resolveSeasonTitle` はすでに一定カバーされている。
Playwright ではログイン、ボード表示、TMDb 検索選択、手動追加→詳細編集→列移動→削除、モバイルタブ切替の主要回帰が入った。
次は Vitest 側の未到達分岐と、E2E のクロスブラウザ運用整理を優先する。

## テスト基盤の拡張検討

### MSW 活用範囲の整理

- 目的
  - TMDb / Supabase まわりの API モックを共通化する
- まず見たい対象
  - backlog CRUD の失敗系
  - TMDb 詳細取得の失敗系
  - Playwright の route モックと Vitest のモックの責務分担

### Vitest Coverage の運用整理

- 目的
  - coverage をもとに未検証の分岐を継続的に埋める
- 見たい観点
  - `useAddSubmit.ts` の送信失敗系・分岐の穴
  - `useTmdbSearch.ts` の検索 / 重複判定 / TV シーズン分岐の穴
  - `backlog-item-utils.ts` / `work-repository.ts` の未到達分岐
  - `BacklogCard.tsx` / `BoardPage.tsx` / `SeasonPicker.tsx` / `TmdbWorkCard.tsx` の UI 分岐
  - `AboutDialog.tsx` / `UserMenu.tsx` / `PlatformIcon.tsx` の低カバレッジ部分

### Playwright 運用整理

- 目的
  - 主要回帰を維持しつつ、実行時間と flaky 率を増やしすぎない
- まず見たい対象
  - `chromium` 以外の `firefox` / `webkit` で必須にする範囲
  - 更新系フローを desktop のみに固定するかどうか
  - CI で回す project と、手動 QA に残す project の切り分け
