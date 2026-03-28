import "./style.css";
import { supabase } from "./lib/supabase.ts";
import { searchTmdbWorks } from "./lib/tmdb.ts";
import {
  getNextSortOrder,
  getSortOrderForDrop,
  normalizeBacklogItems,
  upsertTmdbWork,
} from "./features/backlog/data.ts";
import {
  buildSearchText,
  createInitialAddModalState,
  getDropSide,
  getNullableStringField,
  getStringField,
  normalizePrimaryPlatform,
} from "./features/backlog/helpers.ts";
import {
  createBoardMarkup,
  createErrorMarkup,
  createLoadingMarkup,
  createSignedOutMarkup,
} from "./features/backlog/markup.ts";
import type {
  AddModalState,
  BacklogItem,
  BacklogStatus,
  DragState,
  WorkType,
} from "./features/backlog/types.ts";

const appRoot = document.querySelector<HTMLDivElement>("#app");

let currentSession: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null =
  null;
let currentItems: BacklogItem[] = [];
let addModalState: AddModalState = {
  isOpen: false,
  defaultStatus: "stacked",
  searchQuery: "",
  searchResults: [],
  selectedTmdbResult: null,
  isSearching: false,
  searchMessage: null,
  manualMode: false,
};
let dragState: DragState | null = null;

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
    getAppRoot().innerHTML = createSignedOutMarkup();
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
    getAppRoot().innerHTML = createErrorMarkup(error.message);
    bindSignOutButton();
    return;
  }

  currentItems = normalizeBacklogItems(data ?? []);

  getAppRoot().innerHTML = createBoardMarkup(
    currentItems,
    currentSession.user.email ?? "signed-in user",
    addModalState,
  );
  bindSignedInInteractions();
}

function bindSignedInInteractions() {
  bindSignOutButton();
  bindAddButtons();
  bindAddModal();
  bindDragAndDrop();
}

function getAppRoot() {
  if (!appRoot) {
    throw new Error("App root not found.");
  }

  return appRoot;
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

function bindSignOutButton() {
  const button = document.querySelector<HTMLButtonElement>("#sign-out-button");

  button?.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });
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
  const switchModeButton = document.querySelector<HTMLButtonElement>("#switch-manual-mode");
  const searchButton = document.querySelector<HTMLButtonElement>("#tmdb-search-button");
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

  bindSearchResultButtons();

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

    let work: {
      id: string;
    } | null = null;
    let workError: { message: string } | null = null;

    try {
      const result = selectedTmdbResult
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

      work = result.data;
      workError = result.error ? { message: result.error.message } : null;
    } catch (error) {
      workError = {
        message:
          error instanceof Error ? error.message : "作品の保存中に予期しないエラーが発生しました。",
      };
    }

    if (workError) {
      if (message) {
        message.textContent = `作品の保存に失敗しました: ${workError.message}`;
      }
      return;
    }

    if (!work) {
      if (message) {
        message.textContent = "作品の保存に失敗しました。";
      }
      return;
    }

    const { error: backlogError } = await supabase.from("backlog_items").insert({
      user_id: currentSession.user.id,
      work_id: work.id,
      status,
      primary_platform: primaryPlatform,
      note,
      sort_order: getNextSortOrder(currentItems, status),
    });

    if (backlogError) {
      if (message) {
        message.textContent = `カードの保存に失敗しました: ${backlogError.message}`;
      }
      return;
    }

    addModalState = {
      ...createInitialAddModalState(addModalState.defaultStatus),
      isOpen: false,
    };
    await renderApp();
  });
}

function bindSearchResultButtons() {
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
  const sortOrder = getSortOrderForDrop(currentItems, itemId, targetStatus, targetItemId, side);

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

function clearDropIndicators() {
  for (const element of document.querySelectorAll(
    ".drop-before, .drop-after, .dropzone-active, .card-dragging",
  )) {
    element.classList.remove("drop-before", "drop-after", "dropzone-active", "card-dragging");
  }
}
