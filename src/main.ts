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
  sort_order: number;
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
let currentItems: BacklogItem[] = [];
let addModalState: { isOpen: boolean; defaultStatus: BacklogStatus } = {
  isOpen: false,
  defaultStatus: "stacked",
};

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
      "id, status, display_title, primary_platform, note, sort_order, works(id, title, work_type, source_type, release_date, duration_bucket)",
    )
    .order("sort_order")
    .order("created_at");

  if (error) {
    renderErrorState(error.message);
    bindSignOutButton();
    return;
  }

  const items = normalizeBacklogItems(data ?? []);
  currentItems = items;

  getAppRoot().innerHTML = createBoardMarkup(items, currentSession);
  bindSignOutButton();
  bindAddButtons();
  bindAddModal();
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
            <div class="column-actions">
              <button class="column-add-button" type="button" data-add-status="${status}">
                + 追加
              </button>
              <span class="count-pill">${columnItems.length}</span>
            </div>
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
          <button id="open-add-button" class="primary-button" type="button">作品を追加</button>
          <p class="session-chip">${escapeHtml(session.user.email ?? "signed-in user")}</p>
          <button id="sign-out-button" class="ghost-button" type="button">ログアウト</button>
        </div>
      </section>
      <section class="board">${columns}</section>
      ${addModalState.isOpen ? createAddModalMarkup(addModalState.defaultStatus) : ""}
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

function createAddModalMarkup(defaultStatus: BacklogStatus) {
  const statusOptions = statusOrder
    .map(
      (status) => `
        <option value="${status}" ${status === defaultStatus ? "selected" : ""}>
          ${statusLabels[status]}
        </option>
      `,
    )
    .join("");

  const platformOptions = [
    { value: "", label: "未設定" },
    ...Object.entries(platformLabels).map(([value, label]) => ({ value, label })),
  ]
    .map(
      (option) => `
        <option value="${option.value}">${option.label}</option>
      `,
    )
    .join("");

  return `
    <div class="modal-backdrop" id="add-modal-backdrop">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
        <div class="modal-header">
          <div>
            <p class="eyebrow">Manual Add</p>
            <h2 id="add-modal-title">手動で作品を追加</h2>
          </div>
          <button id="close-add-modal" class="icon-button" type="button" aria-label="閉じる">×</button>
        </div>
        <form id="add-item-form" class="modal-form">
          <label>
            <span>タイトル</span>
            <input name="title" type="text" maxlength="120" required />
          </label>
          <label>
            <span>種別</span>
            <select name="workType">
              <option value="movie">映画</option>
              <option value="series">シリーズ</option>
            </select>
          </label>
          <label>
            <span>保存先列</span>
            <select name="status">${statusOptions}</select>
          </label>
          <label>
            <span>主視聴先</span>
            <select name="primaryPlatform">${platformOptions}</select>
          </label>
          <label>
            <span>メモ</span>
            <textarea name="note" rows="4" maxlength="500"></textarea>
          </label>
          <div class="modal-actions">
            <button id="cancel-add-modal" class="ghost-button" type="button">キャンセル</button>
            <button class="primary-button" type="submit">追加する</button>
          </div>
          <p id="add-form-message" class="form-message" aria-live="polite"></p>
        </form>
      </section>
    </div>
  `;
}

function bindAddButtons() {
  const openButton = document.querySelector<HTMLButtonElement>("#open-add-button");

  openButton?.addEventListener("click", () => {
    addModalState = { isOpen: true, defaultStatus: "stacked" };
    void renderApp();
  });

  const columnButtons = document.querySelectorAll<HTMLButtonElement>("[data-add-status]");

  for (const button of columnButtons) {
    button.addEventListener("click", () => {
      const status = button.dataset.addStatus as BacklogStatus | undefined;

      if (!status) {
        return;
      }

      addModalState = { isOpen: true, defaultStatus: status };
      void renderApp();
    });
  }
}

function bindAddModal() {
  const closeButton = document.querySelector<HTMLButtonElement>("#close-add-modal");
  const cancelButton = document.querySelector<HTMLButtonElement>("#cancel-add-modal");
  const backdrop = document.querySelector<HTMLDivElement>("#add-modal-backdrop");
  const form = document.querySelector<HTMLFormElement>("#add-item-form");
  const message = document.querySelector<HTMLParagraphElement>("#add-form-message");

  const close = () => {
    addModalState = { ...addModalState, isOpen: false };
    void renderApp();
  };

  closeButton?.addEventListener("click", close);
  cancelButton?.addEventListener("click", close);
  backdrop?.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      close();
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentSession) {
      return;
    }

    const formData = new FormData(form);
    const title = getStringField(formData, "title").trim();
    const workType = getStringField(formData, "workType") as Extract<WorkType, "movie" | "series">;
    const status = getStringField(formData, "status") as BacklogStatus;
    const primaryPlatform = normalizePrimaryPlatform(getStringField(formData, "primaryPlatform"));
    const note = getNullableStringField(formData, "note");

    if (!title) {
      if (message) {
        message.textContent = "タイトルを入力してください。";
      }
      return;
    }

    if (message) {
      message.textContent = "作品を追加しています...";
    }

    const { data: work, error: workError } = await supabase
      .from("works")
      .insert({
        created_by: currentSession.user.id,
        source_type: "manual",
        work_type: workType,
        title,
        search_text: buildSearchText(title),
      })
      .select("id")
      .single();

    if (workError) {
      if (message) {
        message.textContent = `作品の保存に失敗しました: ${workError.message}`;
      }
      return;
    }

    const { error: backlogError } = await supabase.from("backlog_items").insert({
      user_id: currentSession.user.id,
      work_id: work.id,
      status,
      primary_platform: primaryPlatform,
      note,
      sort_order: getNextSortOrder(status),
    });

    if (backlogError) {
      if (message) {
        message.textContent = `カードの保存に失敗しました: ${backlogError.message}`;
      }
      return;
    }

    addModalState = { ...addModalState, isOpen: false };
    await renderApp();
  });
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

function normalizePrimaryPlatform(value: string): PrimaryPlatform {
  if (!value) {
    return null;
  }

  return value as Exclude<PrimaryPlatform, null>;
}

function getNullableStringField(formData: FormData, key: string) {
  const value = getStringField(formData, key).trim();
  return value ? value : null;
}

function getNextSortOrder(status: BacklogStatus) {
  const currentMax = currentItems
    .filter((item) => item.status === status)
    .reduce((max, item) => Math.max(max, item.sort_order), 0);

  return currentMax + 1000;
}

function buildSearchText(title: string) {
  return title.trim().toLocaleLowerCase("ja-JP");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
