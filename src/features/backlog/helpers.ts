import type { AddModalState, BacklogStatus, PrimaryPlatform } from "./types.ts";

export function getStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function getNullableStringField(formData: FormData, key: string) {
  const value = getStringField(formData, key).trim();
  return value ? value : null;
}

export function normalizePrimaryPlatform(value: string): PrimaryPlatform {
  if (!value) {
    return null;
  }

  return value as Exclude<PrimaryPlatform, null>;
}

export function buildSearchText(title: string) {
  return title.trim().toLocaleLowerCase("ja-JP");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getDropSide(card: HTMLElement, clientY: number) {
  const rect = card.getBoundingClientRect();
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

export function createInitialAddModalState(defaultStatus: BacklogStatus): AddModalState {
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
