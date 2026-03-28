import type { AddModalState, BacklogItem, BacklogStatus } from "./types.ts";
import { platformLabels, statusLabels, statusOrder } from "./constants.ts";
import { escapeHtml } from "./helpers.ts";

export function createSignedOutMarkup() {
  return `
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

export function createErrorMarkup(message: string) {
  return `
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

export function createLoadingMarkup() {
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

export function createBoardMarkup(
  items: BacklogItem[],
  sessionEmail: string,
  addModalState: AddModalState,
) {
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
            <div class="column-title-group">
              <h2>${statusLabels[status]}</h2>
              <span class="count-pill">${columnItems.length}</span>
            </div>
            <button
              class="column-add-button"
              type="button"
              data-add-status="${status}"
              aria-label="${statusLabels[status]} に追加"
              title="${statusLabels[status]} に追加"
            >
              ${createPlusIcon()}
            </button>
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
          <button
            id="open-add-button"
            class="primary-icon-button"
            type="button"
            aria-label="作品を追加"
            title="作品を追加"
          >
            ${createPlusIcon()}
          </button>
          <p class="session-chip">${escapeHtml(sessionEmail)}</p>
          <button id="sign-out-button" class="ghost-button" type="button">ログアウト</button>
        </div>
      </section>
      <section class="board">${columns}</section>
      ${addModalState.isOpen ? createAddModalMarkup(addModalState) : ""}
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

function createAddModalMarkup(addModalState: AddModalState) {
  const statusOptions = statusOrder
    .map(
      (status) => `
        <option value="${status}" ${status === addModalState.defaultStatus ? "selected" : ""}>
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

function createPlusIcon() {
  return `
    <svg class="plus-icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4.25v11.5M4.25 10h11.5" />
    </svg>
  `;
}
