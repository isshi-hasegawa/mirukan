import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase.ts";
import { getSortOrderForDrop, getTopSortOrder, normalizeBacklogItems } from "../data.ts";
import { getDropSide } from "../helpers.ts";
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

export function BoardPage({ session }: Props) {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalStatus, setAddModalStatus] = useState<BacklogStatus | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModalState>({
    openItemId: null,
    editingField: null,
    draftValue: "",
    message: null,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [selectedTabStatus, setSelectedTabStatus] = useState<BacklogStatus>("stacked");

  const windowWidth = useWindowSize();
  const isMobileLayout = windowWidth <= 720;

  const columnRefs = useRef<Partial<Record<BacklogStatus, HTMLElement | null>>>({});

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

  const handleDragStart = (itemId: string, _status: BacklogStatus) => {
    setDragItemId(itemId);
  };

  const handleDragEnd = () => {
    setDragItemId(null);
    setDropIndicator(null);
  };

  const handleDragOver = (targetItemId: string, clientY: number) => {
    const el = document.querySelector<HTMLElement>(`[data-card-id="${targetItemId}"]`);
    if (!el) return;
    const side = getDropSide(el, clientY);
    setDropIndicator({ type: "card", itemId: targetItemId, side });
  };

  const handleDrop = async (
    targetStatus: BacklogStatus,
    targetItemId: string | null,
    side: "before" | "after",
  ) => {
    if (!dragItemId) return;

    // モバイルレイアウトでは列間ドラッグを無効化
    if (isMobileLayout) {
      const dragItem = items.find((i) => i.id === dragItemId);
      if (dragItem && dragItem.status !== targetStatus) return;
    }

    const sortOrder = getSortOrderForDrop(items, dragItemId, targetStatus, targetItemId, side);

    setDropIndicator(null);

    const { error: updateError } = await supabase
      .from("backlog_items")
      .update({ status: targetStatus, sort_order: sortOrder })
      .eq("id", dragItemId);

    if (updateError) {
      window.alert(`ドラッグ移動に失敗しました: ${updateError.message}`);
      return;
    }

    await loadItems();
  };

  const handleToggleMenu = (itemId: string) => {
    setOpenMenuId((prev) => (prev === itemId ? null : itemId));
  };

  const handleDeleteItem = async (itemId: string) => {
    const { error: deleteError } = await supabase.from("backlog_items").delete().eq("id", itemId);

    if (deleteError) {
      window.alert(`削除に失敗しました: ${deleteError.message}`);
      return;
    }

    setOpenMenuId(null);
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

    setOpenMenuId(null);
    await loadItems();
  };

  const handleMoveToWantToWatch = async (itemId: string) => {
    const sortOrder = getTopSortOrder(items, "want_to_watch");

    const { error: updateError } = await supabase
      .from("backlog_items")
      .update({ status: "want_to_watch", sort_order: sortOrder })
      .eq("id", itemId);

    if (updateError) {
      window.alert(`移動に失敗しました: ${updateError.message}`);
      return;
    }

    setIsRecommendOpen(false);
    await loadItems();

    if (isMobileLayout) {
      setSelectedTabStatus("want_to_watch");
    } else {
      const col = columnRefs.current["want_to_watch"];
      col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  const handleAddWorkToWantToWatch = async (workId: string) => {
    const sortOrder = getTopSortOrder(items, "want_to_watch");

    const { error: insertError } = await supabase.from("backlog_items").insert({
      user_id: session.user.id,
      work_id: workId,
      status: "want_to_watch",
      sort_order: sortOrder,
    });

    if (insertError) {
      window.alert(`追加に失敗しました: ${insertError.message}`);
      return;
    }

    setIsRecommendOpen(false);
    await loadItems();

    if (isMobileLayout) {
      setSelectedTabStatus("want_to_watch");
    } else {
      const col = columnRefs.current["want_to_watch"];
      col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  const handleOpenDetail = (itemId: string) => {
    setOpenMenuId(null);
    setDetailModal({ openItemId: itemId, editingField: null, draftValue: "", message: null });
  };

  const handleCloseDetail = () => {
    setDetailModal({ openItemId: null, editingField: null, draftValue: "", message: null });
  };

  const handleUpdateItem = (updated: BacklogItem) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  if (isLoading) {
    return (
      <main className="shell">
        <section className="board-header">
          <div>
            <h1>backlog を読み込んでいます。</h1>
            <p className="lead">ローカル Supabase の seed データを取得中です。</p>
          </div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell">
        <section className="board-header">
          <div>
            <h1>backlog の取得でつまずいています。</h1>
            <p className="lead">{error}</p>
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={() => void supabase.auth.signOut()}
          >
            ログアウト
          </button>
        </section>
      </main>
    );
  }

  const detailItem = detailModal.openItemId
    ? (items.find((i) => i.id === detailModal.openItemId) ?? null)
    : null;

  return (
    <main
      className="shell"
      onClick={(e) => {
        if (openMenuId === null) return;
        if ((e.target as HTMLElement).closest("[data-card-menu]")) return;
        if ((e.target as HTMLElement).closest("[data-card-menu-toggle]")) return;
        setOpenMenuId(null);
      }}
    >
      <Header session={session} onOpenRecommend={() => setIsRecommendOpen(true)} />

      <KanbanBoard
        items={items}
        dropIndicator={dropIndicator}
        openMenuId={openMenuId}
        isMobileLayout={isMobileLayout}
        isMobileDragging={isMobileLayout && dragItemId !== null}
        selectedTabStatus={selectedTabStatus}
        onTabChange={setSelectedTabStatus}
        onOpenAddModal={setAddModalStatus}
        onOpenDetail={handleOpenDetail}
        onToggleMenu={handleToggleMenu}
        onDeleteItem={(itemId) => void handleDeleteItem(itemId)}
        onMarkAsWatched={(itemId) => void handleMarkAsWatched(itemId)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(targetStatus, targetItemId, side) =>
          void handleDrop(targetStatus, targetItemId, side)
        }
        onDropIndicatorChange={setDropIndicator}
        columnRef={handleColumnRef}
      />

      {isMobileLayout && addModalStatus === null && (
        <button
          type="button"
          className="fab"
          aria-label="作品を追加"
          onClick={() => setAddModalStatus(selectedTabStatus)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" width="24" height="24">
            <path
              d="M10 4.25v11.5M4.25 10h11.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      )}

      {isRecommendOpen && (
        <RecommendModal
          items={items}
          onClose={() => setIsRecommendOpen(false)}
          onOpenDetail={(itemId) => {
            setIsRecommendOpen(false);
            handleOpenDetail(itemId);
          }}
          onMoveToWantToWatch={(itemId) => void handleMoveToWantToWatch(itemId)}
          onAddWorkToWantToWatch={(workId) => void handleAddWorkToWantToWatch(workId)}
        />
      )}

      {addModalStatus !== null && (
        <AddModal
          defaultStatus={addModalStatus}
          items={items}
          session={session}
          onClose={() => setAddModalStatus(null)}
          onAdded={loadItems}
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
