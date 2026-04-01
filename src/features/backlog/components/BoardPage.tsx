import type { Session } from "@supabase/supabase-js";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { Button } from "@/components/ui/button.tsx";
import { supabase } from "../../../lib/supabase.ts";
import { useWindowSize } from "../hooks/useWindowSize.ts";
import { useBacklogItems } from "../hooks/useBacklogItems.ts";
import { useBacklogDnd } from "../hooks/useBacklogDnd.ts";
import { useBacklogActions } from "../hooks/useBacklogActions.ts";
import { useBacklogFeedback } from "../hooks/useBacklogFeedback.tsx";
import { useBoardPageState } from "../hooks/useBoardPageState.ts";
import { Header } from "./Header.tsx";
import { KanbanBoard } from "./KanbanBoard.tsx";
import { AddModal } from "./AddModal.tsx";
import { DetailModal } from "./DetailModal.tsx";
import { DraggedBacklogCardOverlay } from "./DraggedBacklogCardOverlay.tsx";

type Props = { session: Session };

const shellBase =
  "w-full min-w-0 max-w-[1680px] mx-auto px-3 max-[720px]:px-2.5 max-[500px]:px-2 max-[400px]:px-1.5";
const shellBoard = `${shellBase} grid grid-rows-[auto_minmax(0,1fr)] h-svh overflow-hidden pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const shellSimple = `${shellBase} pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const headerCard =
  "w-full min-w-0 border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4";

export function BoardPage({ session }: Props) {
  const windowWidth = useWindowSize();
  const isMobileLayout = windowWidth <= 720;
  const { feedback, feedbackUi } = useBacklogFeedback();

  const { items, setItems, isLoading, error, loadItems } = useBacklogItems();
  const {
    isAddModalOpen,
    detailModal,
    selectedTabStatus,
    setDetailModal,
    setSelectedTabStatus,
    handleOpenAddModal,
    handleCloseAddModal,
    handleOpenDetail,
    handleCloseDetail,
    handleAdded,
    handleItemDeleted,
    handleWorksAdded,
    handleUpdateItem,
    handleColumnRef,
  } = useBoardPageState({
    isMobileLayout,
    setItems,
  });

  const { dragItemId, dropIndicator, sensors, handleDragStart, handleDragOver, handleDragEnd } =
    useBacklogDnd({
      items,
      isMobileLayout,
      onAfterDrop: loadItems,
      feedback,
    });

  const { handleDeleteItem, handleMarkAsWatched } = useBacklogActions({
    items,
    session,
    loadItems,
    onItemDeleted: handleItemDeleted,
    onWorksAdded: handleWorksAdded,
    feedback,
  });

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
      <Header session={session} />

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
          onOpenAddModal={handleOpenAddModal}
          onOpenDetail={handleOpenDetail}
          onDeleteItem={(itemId) => void handleDeleteItem(itemId)}
          onMarkAsWatched={(itemId) => void handleMarkAsWatched(itemId)}
          columnRef={handleColumnRef}
        />
        <DragOverlay dropAnimation={null}>
          {dragItemId ? (
            <DraggedBacklogCardOverlay
              item={items.find((candidate) => candidate.id === dragItemId) ?? null}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {isAddModalOpen && (
        <AddModal
          items={items}
          session={session}
          feedback={feedback}
          onClose={handleCloseAddModal}
          onAdded={async () => {
            await loadItems();
            handleAdded();
          }}
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

      {feedbackUi}
    </main>
  );
}
