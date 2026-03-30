import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button.tsx";
import { supabase } from "../../../lib/supabase.ts";
import {
  buildMoveToStatusConfirmMessage,
  getSortOrderForDrop,
  getTopSortOrder,
  normalizeBacklogItems,
  planBacklogItemUpserts,
  upsertBacklogItemsToStatus,
  upsertTmdbWork,
} from "../data.ts";
import type { TmdbSearchResult } from "../../../lib/tmdb.ts";
import type { BacklogItem, BacklogStatus, DetailModalState } from "../types.ts";
import { useWindowSize } from "../hooks/useWindowSize.ts";
import { Header } from "./Header.tsx";
import { KanbanBoard } from "./KanbanBoard.tsx";
import { AddModal } from "./AddModal.tsx";
import { DetailModal } from "./DetailModal.tsx";
import { RecommendModal } from "./RecommendModal.tsx";

type DropIndicator =
  | { type: "card"; itemId: string; side: "before" | "after" }
  | { type: "column"; status: BacklogStatus };

type Props = { session: Session };

const shellBase =
  "w-full min-w-0 max-w-[1680px] mx-auto px-3 max-[720px]:px-2.5 max-[500px]:px-2 max-[400px]:px-1.5";
const shellBoard = `${shellBase} grid grid-rows-[auto_minmax(0,1fr)] h-svh overflow-hidden pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const shellSimple = `${shellBase} pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const headerCard =
  "w-full min-w-0 border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4";

export function BoardPage({ session }: Props) {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalState>({
    openItemId: null,
    editingField: null,
    draftValue: "",
    message: null,
  });
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [selectedTabStatus, setSelectedTabStatus] = useState<BacklogStatus>("stacked");

  const windowWidth = useWindowSize();
  const isMobileLayout = windowWidth <= 720;

  const columnRefs = useRef<Partial<Record<BacklogStatus, HTMLElement | null>>>({});

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 300, tolerance: 8 },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  const handleColumnRef = (status: BacklogStatus, el: HTMLElement | null) => {
    columnRefs.current[status] = el;
  };

  const loadItems = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("backlog_items")
      .select(
        "id, status, primary_platform, note, sort_order, works(id, title, work_type, source_type, tmdb_id, tmdb_media_type, original_title, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, genres, season_count, season_number, focus_required_score, background_fit_score, completion_load_score)",
      )
      .order("sort_order")
      .order("created_at");

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setItems(normalizeBacklogItems(data ?? []));
      setError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleDragStart = (event: DragStartEvent) => {
    setDragItemId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDropIndicator(null);
      return;
    }

    const overId = over.id as string;
    if (overId.startsWith("column:")) {
      const status = overId.replace("column:", "") as BacklogStatus;
      setDropIndicator({ type: "column", status });
    } else {
      const rect = over.rect;
      const clientY = event.activatorEvent
        ? (event.activatorEvent as MouseEvent | TouchEvent).type.includes("touch")
          ? ((event.activatorEvent as TouchEvent).touches?.[0]?.clientY ??
            rect.top + rect.height / 2)
          : ((event.activatorEvent as MouseEvent).clientY ?? rect.top + rect.height / 2)
        : rect.top + rect.height / 2;
      const side = clientY < rect.top + rect.height / 2 ? "before" : "after";
      setDropIndicator({ type: "card", itemId: overId, side });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragItemId(null);
    setDropIndicator(null);

    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    let targetStatus: BacklogStatus;
    let targetItemId: string | null = null;
    let side: "before" | "after" = "after";

    if (overId.startsWith("column:")) {
      targetStatus = overId.replace("column:", "") as BacklogStatus;
    } else {
      const targetItem = items.find((i) => i.id === overId);
      if (!targetItem) return;
      targetStatus = targetItem.status;
      targetItemId = overId;
      const rect = over.rect;
      const clientY = event.activatorEvent
        ? (event.activatorEvent as MouseEvent | TouchEvent).type.includes("touch")
          ? ((event.activatorEvent as TouchEvent).changedTouches?.[0]?.clientY ??
            rect.top + rect.height / 2)
          : ((event.activatorEvent as MouseEvent).clientY ?? rect.top + rect.height / 2)
        : rect.top + rect.height / 2;
      side = clientY < rect.top + rect.height / 2 ? "before" : "after";
    }

    // モバイルレイアウトでは列間ドラッグを無効化
    if (isMobileLayout) {
      const dragItem = items.find((i) => i.id === draggedId);
      if (dragItem && dragItem.status !== targetStatus) return;
    }

    const sortOrder = getSortOrderForDrop(items, draggedId, targetStatus, targetItemId, side);

    const { error: updateError } = await supabase
      .from("backlog_items")
      .update({ status: targetStatus, sort_order: sortOrder })
      .eq("id", draggedId);

    if (updateError) {
      window.alert(`ドラッグ移動に失敗しました: ${updateError.message}`);
      return;
    }

    await loadItems();
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error: deleteError } = await supabase.from("backlog_items").delete().eq("id", itemId);

    if (deleteError) {
      window.alert(`削除に失敗しました: ${deleteError.message}`);
      return;
    }

    if (detailModal.openItemId === itemId) {
      setDetailModal({ openItemId: null, editingField: null, draftValue: "", message: null });
    }
    await loadItems();
  };

  const handleMarkAsWatched = async (itemId: string) => {
    const sortOrder = getTopSortOrder(items, "watched");

    const { error: updateError } = await supabase
      .from("backlog_items")
      .update({ status: "watched", sort_order: sortOrder })
      .eq("id", itemId);

    if (updateError) {
      window.alert(`変更に失敗しました: ${updateError.message}`);
      return;
    }

    await loadItems();
  };

  const handleAddTmdbWorksToStacked = async (results: TmdbSearchResult[]) => {
    if (results.length === 0) return;

    const workIds: string[] = [];
    for (const result of results) {
      const { data, error } = await upsertTmdbWork(result, session.user.id);
      if (error || !data) {
        console.error(`追加に失敗: ${result.title}`, error);
        continue;
      }
      workIds.push(data.id);
    }

    if (workIds.length === 0) {
      window.alert("作品の追加に失敗しました");
      return;
    }

    const plan = planBacklogItemUpserts(items, workIds, "stacked");
    const confirmMessage = buildMoveToStatusConfirmMessage(
      plan.existingOtherItems,
      "stacked",
      `${results.length}件の作品`,
    );
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    if (plan.actions.length === 0) {
      window.alert("選択した作品はすでにストックにあります");
      return;
    }

    const { error: insertError } = await upsertBacklogItemsToStatus(
      session.user.id,
      items,
      workIds,
      "stacked",
      { primaryPlatform: null, note: null },
    );

    if (insertError) {
      window.alert(`追加に失敗しました: ${insertError}`);
      return;
    }

    await loadItems();

    if (isMobileLayout) {
      setSelectedTabStatus("stacked");
    } else {
      const col = columnRefs.current["stacked"];
      col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  const handleOpenDetail = (itemId: string) => {
    setDetailModal({ openItemId: itemId, editingField: null, draftValue: "", message: null });
  };

  const handleCloseDetail = () => {
    setDetailModal({ openItemId: null, editingField: null, draftValue: "", message: null });
  };

  const handleAdded = async () => {
    await loadItems();
    if (isMobileLayout) {
      setSelectedTabStatus("stacked");
      return;
    }
    const col = columnRefs.current.stacked;
    col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const handleUpdateItem = (updated: BacklogItem) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  if (isLoading) {
    return (
      <main className={shellSimple}>
        <section className={headerCard}>
          <div>
            <h1>backlog を読み込んでいます。</h1>
            <p className="mt-[18px] max-w-[58ch] text-muted-foreground text-[1.02rem]">
              ローカル Supabase の seed データを取得中です。
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className={shellSimple}>
        <section className={headerCard}>
          <div>
            <h1>backlog の取得でつまずいています。</h1>
            <p className="mt-[18px] max-w-[58ch] text-muted-foreground text-[1.02rem]">{error}</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full"
            type="button"
            onClick={() => void supabase.auth.signOut()}
          >
            ログアウト
          </Button>
        </section>
      </main>
    );
  }

  const detailItem = detailModal.openItemId
    ? (items.find((i) => i.id === detailModal.openItemId) ?? null)
    : null;

  return (
    <main className={shellBoard}>
      <Header session={session} onOpenRecommend={() => setIsRecommendOpen(true)} />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <KanbanBoard
          items={items}
          dropIndicator={dropIndicator}
          isMobileLayout={isMobileLayout}
          isMobileDragging={isMobileLayout && dragItemId !== null}
          selectedTabStatus={selectedTabStatus}
          onTabChange={setSelectedTabStatus}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenDetail={handleOpenDetail}
          onDeleteItem={(itemId) => void handleDeleteItem(itemId)}
          onMarkAsWatched={(itemId) => void handleMarkAsWatched(itemId)}
          columnRef={handleColumnRef}
        />
        <DragOverlay dropAnimation={null}>
          {dragItemId ? (
            <div className="opacity-60">
              {(() => {
                const draggedItem = items.find((i) => i.id === dragItemId);
                if (!draggedItem || !draggedItem.works) return null;
                return (
                  <div className="grid gap-[10px] pt-[18px] pr-11 pb-4 pl-4 rounded-[18px] bg-[var(--surface-strong)] border border-[rgba(92,59,35,0.08)] cursor-grabbing pointer-events-none">
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 items-start">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-[14px] border border-[rgba(92,59,35,0.08)]">
                        {draggedItem.works.poster_path && (
                          <img
                            src={`https://image.tmdb.org/t/p/w200${draggedItem.works.poster_path}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="grid gap-2 min-w-0">
                        <p className="text-[1rem] font-bold">{draggedItem.works.title}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isRecommendOpen && (
        <RecommendModal
          items={items}
          onClose={() => setIsRecommendOpen(false)}
          onAddTmdbWorksToStacked={(results) => handleAddTmdbWorksToStacked(results)}
        />
      )}

      {isAddModalOpen && (
        <AddModal
          items={items}
          session={session}
          onClose={() => setIsAddModalOpen(false)}
          onAdded={handleAdded}
        />
      )}

      {detailModal.openItemId !== null && (
        <DetailModal
          item={detailItem}
          state={detailModal}
          items={items}
          onStateChange={setDetailModal}
          onClose={handleCloseDetail}
          onUpdate={handleUpdateItem}
        />
      )}
    </main>
  );
}
