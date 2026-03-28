import type { Session } from "@supabase/supabase-js";
import "./style.css";
import { supabase } from "./lib/supabase.ts";
import { searchTmdbWorks, type TmdbSearchResult } from "./lib/tmdb.ts";

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
let addModalState: {
  isOpen: boolean;
  defaultStatus: BacklogStatus;
  searchQuery: string;
  searchResults: TmdbSearchResult[];
  selectedTmdbResult: TmdbSearchResult | null;
  isSearching: boolean;
  searchMessage: string | null;
  manualMode: boolean;
} = {
  isOpen: false,
  defaultStatus: "stacked",
  searchQuery: "",
  searchResults: [],
  selectedTmdbResult: null,
  isSearching: false,
  searchMessage: null,
  manualMode: false,
};
let dragState: { itemId: string; sourceStatus: BacklogStatus } | null = null;

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
  bindDragAndDrop();
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
        <section class="board-column" data-column-status="${status}">
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
          <div class="card-list" data-dropzone-status="${status}">
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
    work.release_date ? work.release_date.slice(0, 4) : null,
  ].filter(Boolean);

  const noteMarkup = item.note ? `<p class="card-note">${escapeHtml(item.note)}</p>` : "";
  const platformMarkup = item.primary_platform
    ? `<span class="meta-chip">${platformLabels[item.primary_platform]}</span>`
    : "";

  return `
    <article
      class="card"
      draggable="true"
      data-card-id="${item.id}"
      data-card-status="${item.status}"
      data-sort-order="${item.sort_order}"
    >
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

  const selectedSummary = addModalState.selectedTmdbResult
    ? `
      <div class="selected-result">
        <p class="selected-result-label">選択中</p>
        <p class="selected-result-title">${escapeHtml(addModalState.selectedTmdbResult.title)}</p>
        <p class="selected-result-meta">
          ${addModalState.selectedTmdbResult.workType === "movie" ? "映画" : "シリーズ"}
          · TMDb
          ${
            addModalState.selectedTmdbResult.releaseDate
              ? ` · ${escapeHtml(addModalState.selectedTmdbResult.releaseDate.slice(0, 4))}`
              : ""
          }
        </p>
      </div>
    `
    : "";

  const searchResultsMarkup = addModalState.searchResults.length
    ? addModalState.searchResults
        .map(
          (result) => `
            <button
              class="search-result-button ${addModalState.selectedTmdbResult?.tmdbId === result.tmdbId ? "is-selected" : ""}"
              type="button"
              data-tmdb-id="${result.tmdbId}"
              data-tmdb-media-type="${result.tmdbMediaType}"
            >
              <span class="search-result-title">${escapeHtml(result.title)}</span>
              <span class="search-result-meta">
                ${result.workType === "movie" ? "映画" : "シリーズ"}
                ${result.releaseDate ? ` · ${escapeHtml(result.releaseDate.slice(0, 4))}` : ""}
              </span>
              ${
                result.overview
                  ? `<span class="search-result-overview">${escapeHtml(result.overview)}</span>`
                  : ""
              }
            </button>
          `,
        )
        .join("")
    : addModalState.searchMessage
      ? `<p class="search-message">${escapeHtml(addModalState.searchMessage)}</p>`
      : "";

  const resolvedTitle = addModalState.selectedTmdbResult?.title ?? "";
  const resolvedWorkType = addModalState.selectedTmdbResult?.workType ?? "movie";

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
          <div class="search-panel">
            <div class="search-panel-header">
              <div>
                <p class="eyebrow">Search First</p>
                <h3>まず TMDb で探す</h3>
              </div>
              <button id="switch-manual-mode" class="ghost-button" type="button">
                ${addModalState.manualMode ? "検索結果を使う" : "見つからなければ手動で追加"}
              </button>
            </div>
            <div class="search-row">
              <input
                id="tmdb-search-query"
                name="tmdbSearchQuery"
                type="text"
                placeholder="作品名で検索"
                value="${escapeHtml(addModalState.searchQuery)}"
              />
              <button id="tmdb-search-button" class="primary-button" type="button">
                ${addModalState.isSearching ? "検索中..." : "検索"}
              </button>
            </div>
            ${selectedSummary}
            <div class="search-results">${searchResultsMarkup}</div>
          </div>
          <label>
            <span>タイトル</span>
            <input
              name="title"
              type="text"
              maxlength="120"
              value="${escapeHtml(resolvedTitle)}"
              ${addModalState.selectedTmdbResult ? "readonly" : ""}
              required
            />
          </label>
          <label>
            <span>種別</span>
            <select name="workType" ${addModalState.selectedTmdbResult ? "disabled" : ""}>
              <option value="movie" ${resolvedWorkType === "movie" ? "selected" : ""}>映画</option>
              <option value="series" ${resolvedWorkType === "series" ? "selected" : ""}>シリーズ</option>
            </select>
            ${addModalState.selectedTmdbResult ? `<input type="hidden" name="workType" value="${resolvedWorkType}" />` : ""}
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
    addModalState = createInitialAddModalState("stacked");
    void renderApp();
  });

  const columnButtons = document.querySelectorAll<HTMLButtonElement>("[data-add-status]");

  for (const button of columnButtons) {
    button.addEventListener("click", () => {
      const status = button.dataset.addStatus as BacklogStatus | undefined;

      if (!status) {
        return;
      }

      addModalState = createInitialAddModalState(status);
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
  const switchModeButton = document.querySelector<HTMLButtonElement>("#switch-manual-mode");
  const searchButton = document.querySelector<HTMLButtonElement>("#tmdb-search-button");

  closeButton?.addEventListener("click", close);
  cancelButton?.addEventListener("click", close);
  backdrop?.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      close();
    }
  });
  switchModeButton?.addEventListener("click", () => {
    addModalState = {
      ...addModalState,
      manualMode: !addModalState.manualMode,
      selectedTmdbResult: addModalState.manualMode ? addModalState.selectedTmdbResult : null,
    };
    void renderApp();
  });
  searchButton?.addEventListener("click", async () => {
    const queryInput = document.querySelector<HTMLInputElement>("#tmdb-search-query");
    const query = queryInput?.value.trim() ?? "";

    if (!query) {
      addModalState = {
        ...addModalState,
        searchQuery: query,
        searchResults: [],
        searchMessage: "検索キーワードを入力してください。",
      };
      void renderApp();
      return;
    }

    addModalState = {
      ...addModalState,
      searchQuery: query,
      isSearching: true,
      searchMessage: null,
      searchResults: [],
      selectedTmdbResult: null,
      manualMode: false,
    };
    await renderApp();

    try {
      const results = await searchTmdbWorks(query);
      addModalState = {
        ...addModalState,
        isSearching: false,
        searchQuery: query,
        searchResults: results,
        searchMessage:
          results.length > 0
            ? null
            : "TMDb で候補が見つかりませんでした。手動追加に切り替えられます。",
      };
    } catch (error) {
      addModalState = {
        ...addModalState,
        isSearching: false,
        searchQuery: query,
        searchResults: [],
        searchMessage:
          error instanceof Error
            ? `TMDb 検索に失敗しました: ${error.message}`
            : "TMDb 検索に失敗しました。",
      };
    }

    await renderApp();
  });

  const searchResultButtons = document.querySelectorAll<HTMLButtonElement>("[data-tmdb-id]");

  for (const button of searchResultButtons) {
    button.addEventListener("click", () => {
      const tmdbId = Number(button.dataset.tmdbId);
      const tmdbMediaType = button.dataset.tmdbMediaType;
      const selectedResult = addModalState.searchResults.find(
        (result) => result.tmdbId === tmdbId && result.tmdbMediaType === tmdbMediaType,
      );

      if (!selectedResult) {
        return;
      }

      addModalState = {
        ...addModalState,
        selectedTmdbResult: selectedResult,
        manualMode: false,
      };
      void renderApp();
    });
  }

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
    const selectedTmdbResult = addModalState.manualMode ? null : addModalState.selectedTmdbResult;

    if (!title) {
      if (message) {
        message.textContent = "タイトルを入力してください。";
      }
      return;
    }

    if (message) {
      message.textContent = "作品を追加しています...";
    }

    const { data: work, error: workError } = selectedTmdbResult
      ? await upsertTmdbWork(selectedTmdbResult, currentSession.user.id)
      : await supabase
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

    addModalState = { ...createInitialAddModalState(addModalState.defaultStatus), isOpen: false };
    await renderApp();
  });
}

function bindDragAndDrop() {
  const cards = document.querySelectorAll<HTMLElement>("[data-card-id]");
  const dropzones = document.querySelectorAll<HTMLElement>("[data-dropzone-status]");

  for (const card of cards) {
    card.addEventListener("dragstart", (event) => {
      const itemId = card.dataset.cardId;
      const sourceStatus = card.dataset.cardStatus as BacklogStatus | undefined;

      if (!itemId || !sourceStatus) {
        return;
      }

      dragState = { itemId, sourceStatus };
      card.classList.add("card-dragging");
      event.dataTransfer?.setData("text/plain", itemId);
      event.dataTransfer?.setDragImage(card, 24, 24);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    });

    card.addEventListener("dragend", () => {
      dragState = null;
      clearDropIndicators();
    });

    card.addEventListener("dragover", (event) => {
      if (!dragState) {
        return;
      }

      event.preventDefault();
      clearDropIndicators();
      const side = getDropSide(card, event.clientY);
      card.classList.add(side === "before" ? "drop-before" : "drop-after");
    });

    card.addEventListener("drop", async (event) => {
      if (!dragState) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const targetItemId = card.dataset.cardId;
      const targetStatus = card.dataset.cardStatus as BacklogStatus | undefined;

      if (!targetItemId || !targetStatus || targetItemId === dragState.itemId) {
        clearDropIndicators();
        return;
      }

      const side = getDropSide(card, event.clientY);
      await moveItemByDropTarget(dragState.itemId, targetStatus, targetItemId, side);
    });
  }

  for (const dropzone of dropzones) {
    dropzone.addEventListener("dragover", (event) => {
      if (!dragState) {
        return;
      }

      event.preventDefault();
      if (!(event.target instanceof HTMLElement) || event.target.closest("[data-card-id]")) {
        return;
      }

      clearDropIndicators();
      dropzone.classList.add("dropzone-active");
    });

    dropzone.addEventListener("dragleave", (event) => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }

      const relatedTarget =
        event instanceof DragEvent && event.relatedTarget instanceof Node
          ? event.relatedTarget
          : null;

      if (relatedTarget && dropzone.contains(relatedTarget)) {
        return;
      }

      dropzone.classList.remove("dropzone-active");
    });

    dropzone.addEventListener("drop", async (event) => {
      if (!dragState) {
        return;
      }

      event.preventDefault();

      const status = dropzone.dataset.dropzoneStatus as BacklogStatus | undefined;

      if (!status) {
        clearDropIndicators();
        return;
      }

      if (event.target instanceof HTMLElement && event.target.closest("[data-card-id]")) {
        return;
      }

      await moveItemByDropTarget(dragState.itemId, status, null, "after");
    });
  }
}

async function moveItemByDropTarget(
  itemId: string,
  targetStatus: BacklogStatus,
  targetItemId: string | null,
  side: "before" | "after",
) {
  const sortOrder = getSortOrderForDrop(itemId, targetStatus, targetItemId, side);

  const { error } = await supabase
    .from("backlog_items")
    .update({
      status: targetStatus,
      sort_order: sortOrder,
    })
    .eq("id", itemId);

  clearDropIndicators();

  if (error) {
    window.alert(`ドラッグ移動に失敗しました: ${error.message}`);
    return;
  }

  await renderApp();
}

function getSortOrderForDrop(
  itemId: string,
  targetStatus: BacklogStatus,
  targetItemId: string | null,
  side: "before" | "after",
) {
  const targetItems = currentItems
    .filter((item) => item.id !== itemId && item.status === targetStatus)
    .sort((left, right) => left.sort_order - right.sort_order);

  if (!targetItemId) {
    return targetItems.length > 0 ? targetItems.at(-1)!.sort_order + 1000 : 1000;
  }

  const targetIndex = targetItems.findIndex((item) => item.id === targetItemId);

  if (targetIndex === -1) {
    return targetItems.length > 0 ? targetItems.at(-1)!.sort_order + 1000 : 1000;
  }

  const insertionIndex = side === "before" ? targetIndex : targetIndex + 1;
  const previous = insertionIndex > 0 ? targetItems[insertionIndex - 1] : null;
  const next = insertionIndex < targetItems.length ? targetItems[insertionIndex] : null;

  if (!previous && !next) {
    return 1000;
  }

  if (!previous && next) {
    return next.sort_order - 1000;
  }

  if (previous && !next) {
    return previous.sort_order + 1000;
  }

  return (previous!.sort_order + next!.sort_order) / 2;
}

function getDropSide(card: HTMLElement, clientY: number) {
  const rect = card.getBoundingClientRect();
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function clearDropIndicators() {
  for (const element of document.querySelectorAll(
    ".drop-before, .drop-after, .dropzone-active, .card-dragging",
  )) {
    element.classList.remove("drop-before", "drop-after", "dropzone-active", "card-dragging");
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

function createInitialAddModalState(defaultStatus: BacklogStatus) {
  return {
    isOpen: true,
    defaultStatus,
    searchQuery: "",
    searchResults: [],
    selectedTmdbResult: null,
    isSearching: false,
    searchMessage: null,
    manualMode: false,
  };
}

async function upsertTmdbWork(result: TmdbSearchResult, userId: string) {
  const workType = result.workType;

  const { data: existing, error: selectError } = await supabase
    .from("works")
    .select("id")
    .eq("source_type", "tmdb")
    .eq("tmdb_media_type", result.tmdbMediaType)
    .eq("tmdb_id", result.tmdbId)
    .eq("work_type", workType)
    .maybeSingle();

  if (selectError) {
    return { data: null, error: selectError };
  }

  if (existing) {
    return { data: existing, error: null };
  }

  return supabase
    .from("works")
    .insert({
      created_by: userId,
      source_type: "tmdb",
      tmdb_media_type: result.tmdbMediaType,
      tmdb_id: result.tmdbId,
      work_type: workType,
      title: result.title,
      original_title: result.originalTitle,
      search_text: buildSearchText([result.title, result.originalTitle].filter(Boolean).join(" ")),
      overview: result.overview,
      poster_path: result.posterPath,
      release_date: result.releaseDate,
    })
    .select("id")
    .single();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
