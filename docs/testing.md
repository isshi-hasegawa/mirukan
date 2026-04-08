# Testing Guidelines

mirukan のテストでは、
API モックの置き場所を「どの境界を検証したいか」で決める。

## 現状の前提

- Vitest では `src/test/setup.ts` で MSW を常時起動している。
- Supabase REST / Edge Functions 向けの共通ハンドラは
  `src/test/mocks/handlers/` にある。
- 一方で、純粋なユニットテストや UI の分岐確認では
  `vi.mock(...)` も併用している。
- Playwright E2E では基本的に実アプリを通し、
  必要な場面だけ `page.route(...)` で HTTP を差し替える。

この方針は、モック手段を 1 つに統一するためのものではない。
HTTP 境界の契約確認は MSW、
モジュール境界の切り離しは `vi.mock(...)`、
ブラウザ実行時の一時的な差し替えは Playwright `route` として使い分ける。

## 使い分け

- 純粋関数・状態遷移
  - 手段: 直接呼び出し、必要なら `vi.mock(...)`
  - 目的: ロジック単体を素早く確認する
- repository / lib で HTTP 境界をまたぐ処理
  - 手段: MSW
  - 目的: Supabase REST / Edge Functions との契約を維持する
- component / hook の UI 分岐
  - 手段: `vi.mock(...)`
  - 目的: 子依存や重い副作用を外して画面の振る舞いに集中する
- Playwright E2E
  - 手段: 実バックエンド、必要時のみ `page.route(...)`
  - 目的: 画面全体の回帰を見る

## MSW を使う範囲

### 優先して MSW を使う

- `supabase.from(...).select/insert/update/delete` のように
  HTTP リクエストへ落ちる処理
- `supabase.functions.invoke(...)` 経由で Edge Functions を呼ぶ処理
- 成功系と失敗系の両方で、
  レスポンス形やステータスの違いを吸収したいテスト
- 複数テストで再利用したい API モック

### 無理に MSW へ寄せない

- 純粋関数の入力と出力だけを見たいテスト
- 「このコンポーネントがどの関数をどう呼ぶか」だけを
  確認したいテスト
- dnd や dialog など、API とは無関係な UI の分岐テスト

`vi.mock(...)` を禁止しない。
HTTP 境界を通す価値が薄いところまで MSW に寄せると、
テスト意図が逆に読みにくくなる。

## 失敗系の置き場

### backlog CRUD の失敗系

- 第一候補は Vitest + MSW に置く。
- repository テスト、または repository を使う hook / component テストで、
  REST API の 4xx / 5xx やエラーボディを返して確認する。
- Playwright では CRUD の失敗系を網羅しない。
  E2E は代表的な UX 回帰確認にとどめる。

理由:

- CRUD 失敗は Supabase REST の契約とエラーハンドリングが中心で、
  MSW の共通ハンドラと相性がよい。
- E2E で全失敗パターンを拾うとセットアップが重く、
  原因切り分けもしづらい。

### TMDb 詳細取得の失敗系

- `fetchTmdbWorkDetails` など Edge Functions の失敗は、Vitest + MSW で表現する。
- 失敗の種類は少なく保ち、まずは次を代表ケースとする。
  - 非 2xx
  - `error.message` が返る
  - `data` が空または期待形でない
- UI がその失敗をどう見せるかは、
  必要に応じて component テストで確認する。

理由:

- TMDb 系は `supabase.functions.invoke(...)` の契約を見たいので、
  モジュールモックより MSW のほうが境界に近い。
- 失敗の網羅は repository / lib 層で行い、
  画面ではユーザーに見える差分だけを押さえるほうが保守しやすい。

## Playwright `route` の責務

Playwright の `page.route(...)` は、次の用途に限定する。

- ブラウザから見た一時的な API 差し替えが必要なとき
- E2E 内で特定画面の入力候補やエラーパターンをその場で固定したいとき
- バックエンド fixture だけでは再現しにくいとき

逆に、次は Playwright `route` の責務にしない。

- Supabase REST / Edge Functions の契約テスト
- 失敗パターンの網羅
- Vitest でも十分に表現できる UI 以外の分岐確認

E2E に MSW を持ち込むより、
Playwright では `route` を最小限に使うほうが構成が単純で追いやすい。

## 実装ルール

### Vitest で API モックを追加するとき

1. まず `src/test/mocks/handlers/` の共通ハンドラへ置けないか検討する。
2. 既定値から外れるケースだけ `server.use(...)` でテスト内 override する。
3. テストごとの一時状態は `resetMockData()` で戻る前提を崩さない。

### `vi.mock(...)` を追加するとき

1. API 契約ではなく、モジュール境界を切りたい理由があるか確認する。
2. 画面テストでは、
   子コンポーネントや重い hook を差し替える用途を優先する。
3. `supabase.ts` や `tmdb.ts` を直接モックする場合は、
   そのテストが HTTP 境界を捨ててよい理由を
   コメントかテスト名で読めるようにする。

### Playwright でモックを追加するとき

1. まず実データや fixture で再現できないか確認する。
2. `page.route(...)` を使う場合は、その spec 内で閉じる。
3. E2E では成功系の代表導線を優先し、失敗網羅は Vitest 側へ寄せる。

## 迷ったときの判断基準

- HTTP のリクエスト / レスポンス形を守りたい: MSW
- 関数呼び出しの分岐だけ見たい: `vi.mock(...)`
- ブラウザ上で一時的に返り値を固定したい: Playwright `route`

## Playwright project ライン

### 必須ライン（CI で常時実行）

| project    | 対象                                                           |
| ---------- | -------------------------------------------------------------- |
| `chromium` | 更新系フロー（追加・編集・列移動・削除）および閲覧系の主要回帰 |

PR ごとの CI では `chromium` のみを実行し、実行時間と flaky 率を抑える。
更新系フローは `chromium` 固定で担保し、他 project では無理に共通化しない。

### 任意ライン（手動 QA・必要時の追加確認）

| project         | 用途                                 |
| --------------- | ------------------------------------ |
| `firefox`       | クロスブラウザ互換の確認が必要なとき |
| `webkit`        | Safari 系の挙動確認が必要なとき      |
| `Mobile Chrome` | モバイルのタブ切り替えや導線確認     |

任意ラインは通常の CI チェックに含めない。
ローカルで `pnpm test:e2e --project firefox` のように個別実行する。

モバイル回帰は `Mobile Chrome` 1 本に絞り、
確認内容はタブ切り替えや導線確認などの閲覧系に限定する。

## 今後の整理対象

- `src/lib/tmdb.test.ts` の一部は
  `supabase.functions.invoke(...)` 直モックから MSW へ寄せる余地がある。
- `src/features/backlog/backlog-repository.test.ts` など repository 層は、
  段階的に MSW ベースへ寄せる余地がある。
- Playwright は `add-modal.spec.ts` のような局所モックを維持しつつ、
  CRUD の失敗網羅は増やしすぎない。
