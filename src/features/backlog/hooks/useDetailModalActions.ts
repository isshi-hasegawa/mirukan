import {
  applyBacklogItemUpdate,
  buildDetailFieldUpdate,
  getSortOrderForStatusChange,
  type BacklogItemUpdate,
} from "../backlog-item-utils.ts";
import { updateBacklogItem } from "../backlog-repository.ts";
import {
  createDetailEditingState,
  createDetailModalState,
  normalizePrimaryPlatform,
} from "../helpers.ts";
import type {
  BacklogItem,
  BacklogStatus,
  DetailModalEditableField,
  DetailModalState,
} from "../types.ts";

type UseDetailModalActionsOptions = {
  item: BacklogItem | null;
  items: BacklogItem[];
  state: DetailModalState;
  onStateChange: (state: DetailModalState) => void;
  onUpdate: (item: BacklogItem) => void;
};

export function useDetailModalActions({
  item,
  items,
  state,
  onStateChange,
  onUpdate,
}: UseDetailModalActionsOptions) {
  const resetState = () => {
    onStateChange(createDetailModalState(item?.id ?? state.openItemId));
  };

  const setUpdateError = (error: string) => {
    onStateChange({ ...state, message: `更新に失敗しました: ${error}` });
  };

  const saveUpdate = async (update: BacklogItemUpdate) => {
    if (!item) {
      return false;
    }

    const { error } = await updateBacklogItem(item.id, update);
    if (error) {
      setUpdateError(error);
      return false;
    }

    onUpdate(applyBacklogItemUpdate(item, update));
    resetState();
    return true;
  };

  const handleStatusSelect = async (status: BacklogStatus) => {
    if (!item || status === item.status) return;

    const nextSortOrder = getSortOrderForStatusChange(items, item.id, status);
    await saveUpdate({ status, sort_order: nextSortOrder });
  };

  const saveField = async () => {
    if (!state.editingField || !item) return;
    await saveUpdate(buildDetailFieldUpdate(state.editingField, state.draftValue));
  };

  const startEditing = (field: DetailModalEditableField) => {
    if (!item) return;
    onStateChange(createDetailEditingState(item, field));
  };

  const cancelEditing = () => {
    if (!item) return;
    onStateChange(createDetailModalState(item.id));
  };

  const handlePlatformSelect = async (value: string) => {
    await saveUpdate({ primary_platform: normalizePrimaryPlatform(value) });
  };

  return {
    cancelEditing,
    handlePlatformSelect,
    handleStatusSelect,
    saveField,
    startEditing,
  };
}
