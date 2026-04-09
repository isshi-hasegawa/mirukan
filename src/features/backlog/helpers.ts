import type {
  BacklogItem,
  BacklogStatus,
  DetailModalEditableField,
  DetailModalState,
  DropIndicator,
  PrimaryPlatform,
  ResolvedDropTarget,
  WorkType,
} from "./types.ts";
import { isPrimaryPlatformValue } from "./constants.ts";

type RectLike = Pick<DOMRect, "top" | "height">;

export function getStringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function getNullableStringField(formData: FormData, key: string) {
  const value = getStringField(formData, key).trim();
  return value ? value : null;
}

export function isPrimaryPlatform(value: unknown): value is PrimaryPlatform {
  return value === null || isPrimaryPlatformValue(value);
}

export function normalizePrimaryPlatform(value: string | null): PrimaryPlatform {
  return isPrimaryPlatformValue(value) ? value : null;
}

export function createDetailModalState(
  openItemId: string | null,
  overrides: Partial<Omit<DetailModalState, "openItemId">> = {},
): DetailModalState {
  return {
    openItemId,
    editingField: null,
    draftValue: "",
    message: null,
    ...overrides,
  };
}

export function createDetailEditingState(
  item: BacklogItem,
  field: DetailModalEditableField,
): DetailModalState {
  return createDetailModalState(item.id, {
    editingField: field,
    draftValue: field === "primaryPlatform" ? (item.primary_platform ?? "") : (item.note ?? ""),
  });
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

export function getDropSideFromRect(rect: RectLike, clientY: number) {
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

export function getClientYFromPointerEvent(
  event: MouseEvent | TouchEvent | null | undefined,
  rect: RectLike,
  touchListKey: "touches" | "changedTouches" = "touches",
) {
  const fallbackY = rect.top + rect.height / 2;

  if (!event) {
    return fallbackY;
  }

  if ("touches" in event && event.type.includes("touch")) {
    const touchList = touchListKey === "changedTouches" ? event.changedTouches : event.touches;
    return touchList?.[0]?.clientY ?? fallbackY;
  }

  return "clientY" in event ? (event.clientY ?? fallbackY) : fallbackY;
}

export function getDropIndicator(overId: string, rect: RectLike, clientY: number): DropIndicator {
  if (overId.startsWith("column:")) {
    return {
      type: "column",
      status: overId.replace("column:", "") as BacklogStatus,
    };
  }

  if (overId.startsWith("top-slot:")) {
    return {
      type: "top-slot",
      status: overId.replace("top-slot:", "") as BacklogStatus,
    };
  }

  if (overId.startsWith("bottom-slot:")) {
    return {
      type: "bottom-slot",
      status: overId.replace("bottom-slot:", "") as BacklogStatus,
    };
  }

  return {
    type: "card",
    itemId: overId,
    side: getDropSideFromRect(rect, clientY),
  };
}

export function resolveDropTarget(
  items: BacklogItem[],
  overId: string,
  rect: RectLike,
  clientY: number,
): ResolvedDropTarget | null {
  if (overId.startsWith("top-slot:")) {
    const status = overId.replace("top-slot:", "") as BacklogStatus;
    const columnItems = items
      .filter((item) => item.status === status)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (columnItems.length > 0) {
      return { status, targetItemId: columnItems[0].id, side: "before" };
    }
    return { status, targetItemId: null, side: "after" };
  }

  if (overId.startsWith("bottom-slot:")) {
    const status = overId.replace("bottom-slot:", "") as BacklogStatus;
    return { status, targetItemId: null, side: "after" };
  }

  if (overId.startsWith("column:")) {
    const status = overId.replace("column:", "") as BacklogStatus;
    const hasItems = items.some((item) => item.status === status);
    if (hasItems) return null;
    return { status, targetItemId: null, side: "after" };
  }

  const targetItem = items.find((item) => item.id === overId);
  if (!targetItem) {
    return null;
  }

  return {
    status: targetItem.status,
    targetItemId: overId,
    side: getDropSideFromRect(rect, clientY),
  };
}

export function getWorkTypeLabel(workType: WorkType) {
  return workType === "movie" ? "映画" : "シリーズ";
}
