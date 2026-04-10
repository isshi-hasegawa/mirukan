import { lazy, Suspense } from "react";
import type { Session } from "@supabase/supabase-js";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { Button } from "@/components/ui/button.tsx";
import { signOut } from "../../../lib/auth-repository.ts";
import { useBoardPageController } from "../hooks/useBoardPageController.ts";
import { Header } from "./Header.tsx";
import { KanbanBoard } from "./KanbanBoard.tsx";
import { DraggedBacklogCardOverlay } from "./DraggedBacklogCardOverlay.tsx";

const AddModal = lazy(async () => ({
  default: (await import("./AddModal.tsx")).AddModal,
}));

const DetailModal = lazy(async () => ({
  default: (await import("./DetailModal.tsx")).DetailModal,
}));

type Props = { session: Session };

const shellBase =
  "w-full min-w-0 max-w-[1680px] mx-auto px-3 max-[720px]:px-2.5 max-[500px]:px-2 max-[400px]:px-1.5";
const shellBoard = `${shellBase} grid grid-rows-[auto_minmax(0,1fr)] h-svh overflow-hidden pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const shellSimple = `${shellBase} pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const headerCard =
  "w-full min-w-0 border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4";

export function BoardPage({ session }: Props) {
  const { isLoading, error, board, dnd, addModal, detailModal, feedbackUi } =
    useBoardPageController({ session });

  if (isLoading) {
    return null;
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
            onClick={() => void signOut()}
          >
            ログアウト
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className={shellBoard}>
      <Header session={session} />

      <DndContext
        sensors={dnd.sensors}
        collisionDetection={pointerWithin}
        onDragStart={dnd.handleDragStart}
        onDragOver={dnd.handleDragOver}
        onDragCancel={dnd.handleDragCancel}
        onDragEnd={(e) => void dnd.handleDragEnd(e)}
      >
        <KanbanBoard {...board} />
        <DragOverlay dropAnimation={null}>
          {dnd.dragItemId ? (
            <DraggedBacklogCardOverlay
              item={dnd.localItems.find((candidate) => candidate.id === dnd.dragItemId) ?? null}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {addModal.isOpen && (
        <Suspense fallback={null}>
          <AddModal
            items={addModal.items}
            session={addModal.session}
            onClose={addModal.onClose}
            onAdded={addModal.onAdded}
          />
        </Suspense>
      )}

      {detailModal.isOpen && (
        <Suspense fallback={null}>
          <DetailModal
            item={detailModal.item}
            state={detailModal.state}
            items={detailModal.items}
            onStateChange={detailModal.onStateChange}
            onClose={detailModal.onClose}
            onReload={detailModal.onReload}
          />
        </Suspense>
      )}

      {feedbackUi}
    </main>
  );
}
