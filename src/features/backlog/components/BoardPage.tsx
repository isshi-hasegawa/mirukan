import { useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Button } from "@/components/ui/button.tsx";
import { supabase } from "../../../lib/supabase.ts";
import type { BacklogItem, BacklogStatus, DetailModalState } from "../types.ts";
import { createDetailModalState } from "../helpers.ts";
import { useWindowSize } from "../hooks/useWindowSize.ts";
import { useBacklogItems } from "../hooks/useBacklogItems.ts";
import { useBacklogDnd } from "../hooks/useBacklogDnd.ts";
import { useBacklogActions } from "../hooks/useBacklogActions.ts";
import { Header } from "./Header.tsx";
import { KanbanBoard } from "./KanbanBoard.tsx";
import { AddModal } from "./AddModal.tsx";
import { DetailModal } from "./DetailModal.tsx";
import { RecommendModal } from "./RecommendModal.tsx";

type Props = { session: Session };

const shellBase =
  "w-full min-w-0 max-w-[1680px] mx-auto px-3 max-[720px]:px-2.5 max-[500px]:px-2 max-[400px]:px-1.5";
const shellBoard = `${shellBase} grid grid-rows-[auto_minmax(0,1fr)] h-svh overflow-hidden pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const shellSimple = `${shellBase} pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const headerCard =
  "w-full min-w-0 border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4";

export function BoardPage({ session }: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalState>(createDetailModalState(null));
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [selectedTabStatus, setSelectedTabStatus] = useState<BacklogStatus>("stacked");

  const windowWidth = useWindowSize();
  const isMobileLayout = windowWidth <= 720;

  const columnRefs = useRef<Partial<Record<BacklogStatus, HTMLElement | null>>>({});

  const { items, setItems, isLoading, error, loadItems } = useBacklogItems();

  const { dragItemId, dropIndicator, sensors, handleDragStart, handleDragOver, handleDragEnd } =
    useBacklogDnd({
      items,
      isMobileLayout,
      onAfterDrop: loadItems,
    });

  const { handleDeleteItem, handleMarkAsWatched, handleAddTmdbWorksToStacked } = useBacklogActions({
    items,
    session,
    loadItems,
    onItemDeleted: (itemId) => {
      if (detailModal.openItemId === itemId) {
        setDetailModal(createDetailModalState(null));
      }
    },
    onWorksAdded: () => {
      if (isMobileLayout) {
        setSelectedTabStatus("stacked");
      } else {
        const col = columnRefs.current["stacked"];
        col?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    },
  });

  const handleOpenDetail = (itemId: string) => {
    setDetailModal(createDetailModalState(itemId));
  };

  const handleCloseDetail = () => {
    setDetailModal(createDetailModalState(null));
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

  const handleColumnRef = (status: BacklogStatus, el: HTMLElement | null) => {
    columnRefs.current[status] = el;
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
