import type { AddModalState, BacklogItem, BacklogStatus, DetailModalState } from "./types.ts";
import { platformLabels, statusLabels, statusOrder } from "./constants.ts";
import { escapeHtml } from "./helpers.ts";

export function createSignedOutMarkup() {
  return `
    <main class="shell">
      <section class="intro-card">
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
  openCardMenuId: string | null,
  detailModalState: DetailModalState,
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
                ? columnItems.map((item) => createCardMarkup(item, openCardMenuId)).join("")
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
          <h1>みるカン</h1>
        </div>
        <div class="header-actions">
          <button
            id="open-add-button"
            class="primary-button"
            type="button"
            aria-label="作品を探す"
            title="作品を探す"
          >
            ${createSearchIcon()}
            作品を探す
          </button>
          <p class="session-chip">${escapeHtml(sessionEmail)}</p>
          <button id="sign-out-button" class="ghost-button" type="button">ログアウト</button>
        </div>
      </section>
      <section class="board">${columns}</section>
      ${addModalState.isOpen ? createAddModalMarkup(addModalState) : ""}
      ${
        detailModalState.openItemId
          ? createDetailModalMarkup(
              items.find((item) => item.id === detailModalState.openItemId) ?? null,
              detailModalState,
            )
          : ""
      }
    </main>
  `;
}

function createCardMarkup(item: BacklogItem, openCardMenuId: string | null) {
  const work = item.works;

  if (!work) {
    return "";
  }

  const title = item.display_title ?? work.title;
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w185${work.poster_path}` : null;
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
      tabindex="0"
    >
      <div class="card-topline">
        <div class="card-menu-wrap">
          <button
            class="card-menu-button"
            type="button"
            data-card-menu-toggle="${item.id}"
            aria-label="カードメニューを開く"
            title="カードメニューを開く"
          >
            ${createDotsIcon()}
          </button>
          ${
            openCardMenuId === item.id
              ? `
                <div class="card-menu" data-card-menu="${item.id}">
                  <button
                    class="card-menu-item danger"
                    type="button"
                    data-delete-backlog-id="${item.id}"
                  >
                    削除
                  </button>
                </div>
              `
              : ""
          }
        </div>
      </div>
      <div class="card-body">
        <div class="card-thumb">
          ${
            posterUrl
              ? `<img src="${posterUrl}" alt="${escapeHtml(title)} のポスター" />`
              : '<div class="card-thumb-fallback">No Poster</div>'
          }
        </div>
        <div class="card-content">
          <p class="card-title">${escapeHtml(title)}</p>
          <p class="card-meta">${metadata.map((value) => escapeHtml(String(value))).join(" · ")}</p>
          <div class="card-footer">
            ${platformMarkup}
          </div>
          ${noteMarkup}
        </div>
      </div>
    </article>
  `;
}

function createDetailModalMarkup(item: BacklogItem | null, detailModalState: DetailModalState) {
  if (!item || !item.works) {
    return "";
  }

  const work = item.works;
  const title = item.display_title ?? work.title;
  const posterUrl = work.poster_path ? `https://image.tmdb.org/t/p/w500${work.poster_path}` : null;
  const metadata = [
    work.work_type === "movie" ? "映画" : work.work_type === "series" ? "シリーズ" : "シーズン",
    work.release_date ? work.release_date.slice(0, 4) : null,
    work.runtime_minutes ? `${work.runtime_minutes}分` : null,
    work.typical_episode_runtime_minutes ? `1話 ${work.typical_episode_runtime_minutes}分` : null,
    work.season_count ? `${work.season_count}シーズン` : null,
  ].filter(Boolean);

  const genres = work.genres.length
    ? work.genres.map((genre) => `<span class="meta-chip">${escapeHtml(genre)}</span>`).join("")
    : '<span class="detail-empty">ジャンル未設定</span>';
  const platformOptions = createPlatformOptions(item.primary_platform);
  const detailFormMarkup = detailModalState.isEditing
    ? `
      <form id="detail-edit-form" class="detail-edit-form">
        <label>
          <span>表示名</span>
          <input
            name="displayTitle"
            type="text"
            maxlength="120"
            value="${escapeHtml(item.display_title ?? "")}"
            placeholder="${escapeHtml(work.title)}"
          />
        </label>
        <label>
          <span>状態</span>
          <select name="status">${createStatusOptions(item.status)}</select>
        </label>
        <label>
          <span>視聴先</span>
          <select name="primaryPlatform">${platformOptions}</select>
        </label>
        <label>
          <span>メモ</span>
          <textarea name="note" rows="5" maxlength="500">${escapeHtml(item.note ?? "")}</textarea>
        </label>
        <div class="detail-actions">
          <button id="cancel-detail-edit" class="ghost-button" type="button">キャンセル</button>
          <button class="primary-button" type="submit">保存する</button>
        </div>
        <p id="detail-form-message" class="form-message" aria-live="polite">${escapeHtml(detailModalState.message ?? "")}</p>
      </form>
    `
    : `
      <div class="detail-actions">
        <button id="open-detail-edit" class="primary-button" type="button">編集する</button>
      </div>
      <p id="detail-form-message" class="form-message" aria-live="polite">${escapeHtml(detailModalState.message ?? "")}</p>
    `;

  return `
    <div class="modal-backdrop" id="detail-modal-backdrop">
      <section class="detail-modal-card" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
        <div class="detail-modal-header">
          <p class="eyebrow">Detail</p>
          <button id="close-detail-modal" class="icon-button" type="button" aria-label="閉じる">×</button>
        </div>
        <div class="detail-modal-body">
          <div class="detail-poster">
            ${
              posterUrl
                ? `<img src="${posterUrl}" alt="${escapeHtml(title)} のポスター" />`
                : '<div class="detail-poster-fallback">No Poster</div>'
            }
          </div>
          <div class="detail-content">
            <h2 id="detail-modal-title">${escapeHtml(title)}</h2>
            ${
              work.original_title && work.original_title !== title
                ? `<p class="detail-original-title">${escapeHtml(work.original_title)}</p>`
                : ""
            }
            <p class="detail-meta">${metadata.map((value) => escapeHtml(String(value))).join(" · ")}</p>
            <div class="detail-chip-row">${genres}</div>
            ${
              item.primary_platform
                ? `<p class="detail-field"><span>視聴先</span>${escapeHtml(platformLabels[item.primary_platform])}</p>`
                : ""
            }
            ${
              item.note
                ? `<div class="detail-section"><h3>メモ</h3><p>${escapeHtml(item.note)}</p></div>`
                : ""
            }
            ${
              work.overview
                ? `<div class="detail-section"><h3>あらすじ</h3><p>${escapeHtml(work.overview)}</p></div>`
                : ""
            }
            ${detailFormMarkup}
          </div>
        </div>
      </section>
    </div>
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
        <p class="selected-result-title">${escapeHtml(addModalState.selectedTmdbTarget?.title ?? addModalState.selectedTmdbResult.title)}</p>
        <p class="selected-result-meta">
          ${
            addModalState.selectedTmdbTarget?.workType === "season"
              ? "シーズン"
              : addModalState.selectedTmdbResult.workType === "movie"
                ? "映画"
                : "シリーズ"
          }
          ${addModalState.selectedTmdbTarget?.workType === "season" ? ` · シーズン${addModalState.selectedTmdbTarget.seasonNumber}` : ""}
          ${
            (addModalState.selectedTmdbTarget?.releaseDate ??
            addModalState.selectedTmdbResult.releaseDate)
              ? ` · ${escapeHtml((addModalState.selectedTmdbTarget?.releaseDate ?? addModalState.selectedTmdbResult.releaseDate)!.slice(0, 4))}`
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

  const resolvedTitle = addModalState.selectedTmdbTarget?.title ?? "";
  const resolvedWorkType =
    addModalState.selectedTmdbTarget?.workType === "season"
      ? "series"
      : (addModalState.selectedTmdbTarget?.workType ?? "movie");
  const seasonPickerMarkup =
    addModalState.selectedTmdbResult?.tmdbMediaType === "tv"
      ? `
        <div class="season-picker">
          <div class="season-picker-header">
            <div>
              <p class="selected-result-label">追加単位</p>
              <p class="season-picker-copy">シリーズ全体で積むか、シーズン単位で積むかを選べます。</p>
            </div>
            ${
              addModalState.selectedTmdbTarget?.workType === "season"
                ? `<span class="season-selection-badge">シーズン${addModalState.selectedTmdbTarget.seasonNumber}を選択中</span>`
                : '<span class="season-selection-badge">シリーズ全体を選択中</span>'
            }
          </div>
          <div class="season-option-list">
            <button
              class="season-option-button ${addModalState.selectedTmdbTarget?.workType !== "season" ? "is-selected" : ""}"
              type="button"
              data-select-series-target="true"
            >
              シリーズ全体
            </button>
            ${
              addModalState.seasonOptions.length > 0
                ? addModalState.seasonOptions
                    .map(
                      (season) => `
                        <button
                          class="season-option-button ${addModalState.selectedTmdbTarget?.workType === "season" && addModalState.selectedTmdbTarget.seasonNumber === season.seasonNumber ? "is-selected" : ""}"
                          type="button"
                          data-select-season-number="${season.seasonNumber}"
                        >
                          シーズン${season.seasonNumber}
                          ${season.episodeCount ? `<span>${season.episodeCount}話</span>` : ""}
                        </button>
                      `,
                    )
                    .join("")
                : addModalState.isLoadingSeasons
                  ? '<p class="search-message">シーズン一覧を読み込んでいます...</p>'
                  : ""
            }
          </div>
        </div>
      `
      : "";

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
            ${seasonPickerMarkup}
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
            <span>視聴先</span>
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

function createDotsIcon() {
  return `
    <svg class="dots-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="4.25" r="1.4" />
      <circle cx="10" cy="10" r="1.4" />
      <circle cx="10" cy="15.75" r="1.4" />
    </svg>
  `;
}

function createSearchIcon() {
  return `
    <svg class="search-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="4.75" />
      <path d="M12.2 12.2 16 16" />
    </svg>
  `;
}

function createPlatformOptions(selectedPlatform: BacklogItem["primary_platform"]) {
  return [
    { value: "", label: "未設定" },
    ...Object.entries(platformLabels).map(([value, label]) => ({ value, label })),
  ]
    .map(
      (option) => `
        <option value="${option.value}" ${selectedPlatform === option.value ? "selected" : ""}>
          ${option.label}
        </option>
      `,
    )
    .join("");
}

function createStatusOptions(selectedStatus: BacklogStatus) {
  return statusOrder
    .map(
      (status) => `
        <option value="${status}" ${selectedStatus === status ? "selected" : ""}>
          ${statusLabels[status]}
        </option>
      `,
    )
    .join("");
}
