import type { Session } from "@supabase/supabase-js";
import "./style.css";
import { supabase } from "./lib/supabase.ts";

type BacklogStatus = "stacked" | "want_to_watch" | "watching" | "interrupted" | "watched";

type WorkType = "movie" | "series" | "season";
type SourceType = "tmdb" | "manual";
type PrimaryPlatform =
  | "netflix"
  | "prime_video"
  | "u_next"
  | "disney_plus"
  | "apple_tv_plus"
  | "theater"
  | "other"
  | null;

type WorkSummary = {
  id: string;
  title: string;
  work_type: WorkType;
  source_type: SourceType;
  release_date: string | null;
  duration_bucket: "short" | "medium" | "long" | "very_long" | null;
};

type BacklogItem = {
  id: string;
  status: BacklogStatus;
  display_title: string | null;
  primary_platform: PrimaryPlatform;
  note: string | null;
  works: WorkSummary | null;
};

type BacklogItemRow = Omit<BacklogItem, "works"> & {
  works: WorkSummary | WorkSummary[] | null;
};

const statusOrder: BacklogStatus[] = [
  "stacked",
  "want_to_watch",
  "watching",
  "interrupted",
  "watched",
];

const statusLabels: Record<BacklogStatus, string> = {
  stacked: "積み",
  want_to_watch: "見たい",
  watching: "視聴中",
  interrupted: "中断",
  watched: "視聴済み",
};

const statusDescriptions: Record<BacklogStatus, string> = {
  stacked: "あとで見る候補を雑多に積んでおく列",
  want_to_watch: "近いうちに見る候補を寄せる列",
  watching: "いま進行中として扱う列",
  interrupted: "止まっているけれど終えていない列",
  watched: "見終わったものを残しておく列",
};

const platformLabels: Record<Exclude<PrimaryPlatform, null>, string> = {
  netflix: "Netflix",
  prime_video: "Prime Video",
  u_next: "U-NEXT",
  disney_plus: "Disney+",
  apple_tv_plus: "Apple TV+",
  theater: "劇場",
  other: "その他",
};

const appRoot = document.querySelector<HTMLDivElement>("#app");

let currentSession: Session | null = null;

void bootstrap();

async function bootstrap() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  currentSession = session;
  await renderApp();

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    void renderApp();
  });
}

async function renderApp() {
  if (!currentSession) {
    renderSignedOut();
    bindLoginForm();
    return;
  }

  getAppRoot().innerHTML = createLoadingMarkup();

  const { data, error } = await supabase
    .from("backlog_items")
    .select(
      "id, status, display_title, primary_platform, note, works(id, title, work_type, source_type, release_date, duration_bucket)",
    )
    .order("sort_order")
    .order("created_at");

  if (error) {
    renderErrorState(error.message);
    bindSignOutButton();
    return;
  }

  const items = normalizeBacklogItems(data ?? []);

  getAppRoot().innerHTML = createBoardMarkup(items, currentSession);
  bindSignOutButton();
}

function renderSignedOut() {
  getAppRoot().innerHTML = `
    <main class="shell">
      <section class="intro-card">
        <p class="eyebrow">Mirukan Local Preview</p>
        <h1>みるカンの土台を、まず本物のデータで見る。</h1>
        <p class="lead">
          ローカル Supabase に接続して、seed 済みの backlog をそのまま 5 列で確認できます。
        </p>
        <dl class="credentials">
          <div>
            <dt>メール</dt>
            <dd><code>akari@example.com</code></dd>
          </div>
          <div>
            <dt>パスワード</dt>
            <dd><code>password123</code></dd>
          </div>
        </dl>
      </section>

      <section class="auth-card">
        <h2>ローカルログイン</h2>
        <form id="login-form" class="auth-form">
          <label>
            <span>メールアドレス</span>
            <input name="email" type="email" autocomplete="email" value="akari@example.com" required />
          </label>
          <label>
            <span>パスワード</span>
            <input
              name="password"
              type="password"
              autocomplete="current-password"
              value="password123"
              required
            />
          </label>
          <button type="submit">ログインして backlog を見る</button>
          <p id="auth-message" class="form-message" aria-live="polite"></p>
        </form>
      </section>
    </main>
  `;
}

function renderErrorState(message: string) {
  getAppRoot().innerHTML = `
    <main class="shell">
      <section class="board-header">
        <div>
          <p class="eyebrow">Mirukan Local Preview</p>
          <h1>backlog の取得でつまずいています。</h1>
          <p class="lead">${escapeHtml(message)}</p>
        </div>
        <button id="sign-out-button" class="ghost-button" type="button">ログアウト</button>
      </section>
    </main>
  `;
}

function bindLoginForm() {
  const form = document.querySelector<HTMLFormElement>("#login-form");
  const message = document.querySelector<HTMLParagraphElement>("#auth-message");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = getStringField(formData, "email");
    const password = getStringField(formData, "password");

    if (message) {
      message.textContent = "ログインしています...";
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (message) {
        message.textContent = `ログインに失敗しました: ${error.message}`;
      }
      return;
    }

    if (message) {
      message.textContent = "ログインに成功しました。";
    }
  });
}

function normalizeBacklogItems(rows: unknown[]): BacklogItem[] {
  return rows.flatMap((row) => {
    const item = row as BacklogItemRow;
    const work = Array.isArray(item.works) ? item.works[0] : item.works;

    if (!work) {
      return [];
    }

    return [{ ...item, works: work }];
  });
}

function getStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getAppRoot() {
  if (!appRoot) {
    throw new Error("App root not found.");
  }

  return appRoot;
}

function bindSignOutButton() {
  const button = document.querySelector<HTMLButtonElement>("#sign-out-button");

  button?.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
}

function createLoadingMarkup() {
  return `
    <main class="shell">
      <section class="board-header">
        <div>
          <p class="eyebrow">Mirukan Local Preview</p>
          <h1>backlog を読み込んでいます。</h1>
          <p class="lead">ローカル Supabase の seed データを取得中です。</p>
        </div>
      </section>
    </main>
  `;
}

function createBoardMarkup(items: BacklogItem[], session: Session) {
  const grouped = new Map<BacklogStatus, BacklogItem[]>(statusOrder.map((status) => [status, []]));

  for (const item of items) {
    grouped.get(item.status)?.push(item);
  }

  const columns = statusOrder
    .map((status) => {
      const columnItems = grouped.get(status) ?? [];

      return `
        <section class="board-column">
          <header class="column-header">
            <div>
              <h2>${statusLabels[status]}</h2>
              <p>${statusDescriptions[status]}</p>
            </div>
            <span class="count-pill">${columnItems.length}</span>
          </header>
          <div class="card-list">
            ${
              columnItems.length > 0
                ? columnItems.map((item) => createCardMarkup(item)).join("")
                : '<p class="empty-state">この列にはまだカードがありません。</p>'
            }
          </div>
        </section>
      `;
    })
    .join("");

  return `
    <main class="shell">
      <section class="board-header">
        <div>
          <p class="eyebrow">Mirukan Local Preview</p>
          <h1>みるカン backlog</h1>
          <p class="lead">
            seed データをそのまま 5 列に並べています。次は追加モーダルや並び替えを載せていけます。
          </p>
        </div>
        <div class="header-actions">
          <p class="session-chip">${escapeHtml(session.user.email ?? "signed-in user")}</p>
          <button id="sign-out-button" class="ghost-button" type="button">ログアウト</button>
        </div>
      </section>
      <section class="board">${columns}</section>
    </main>
  `;
}

function createCardMarkup(item: BacklogItem) {
  const work = item.works;

  if (!work) {
    return "";
  }

  const title = item.display_title ?? work.title;
  const metadata = [
    work.work_type === "movie" ? "映画" : work.work_type === "series" ? "シリーズ" : "シーズン",
    work.source_type === "tmdb" ? "TMDb" : "手動追加",
    work.release_date ? work.release_date.slice(0, 4) : null,
    formatDurationBucket(work.duration_bucket),
  ].filter(Boolean);

  const noteMarkup = item.note ? `<p class="card-note">${escapeHtml(item.note)}</p>` : "";
  const platformMarkup = item.primary_platform
    ? `<span class="meta-chip">${platformLabels[item.primary_platform]}</span>`
    : "";

  return `
    <article class="card">
      <p class="card-title">${escapeHtml(title)}</p>
      <p class="card-meta">${metadata.map((value) => escapeHtml(String(value))).join(" · ")}</p>
      <div class="card-footer">
        ${platformMarkup}
      </div>
      ${noteMarkup}
    </article>
  `;
}

function formatDurationBucket(value: WorkSummary["duration_bucket"]) {
  switch (value) {
    case "short":
      return "短め";
    case "medium":
      return "中くらい";
    case "long":
      return "長め";
    case "very_long":
      return "かなり長め";
    default:
      return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
