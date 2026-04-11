import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { Button } from "@/components/ui/button.tsx";
import { LazyViewBoundary } from "@/components/LazyViewBoundary.tsx";
import { signOut } from "../../../lib/auth-repository.ts";
import { lazyNamed } from "../../../lib/lazy-component.ts";
import { useBoardPageController } from "../hooks/useBoardPageController.ts";
import { Header } from "./Header.tsx";
import { KanbanBoard } from "./KanbanBoard.tsx";
import { DraggedBacklogCardOverlay } from "./DraggedBacklogCardOverlay.tsx";

const AddModal = lazyNamed(() => import("./AddModal.tsx"), "AddModal");
const DetailModal = lazyNamed(() => import("./DetailModal.tsx"), "DetailModal");

type Props = { session: Session };

const shellBase =
  "w-full min-w-0 max-w-[1680px] mx-auto px-3 max-[720px]:px-2.5 max-[500px]:px-2 max-[400px]:px-1.5";
const shellBoard = `${shellBase} grid grid-rows-[auto_minmax(0,1fr)] h-svh overflow-hidden pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const shellSimple = `${shellBase} pt-[14px] pb-3 max-[720px]:py-[10px] max-[500px]:py-2 max-[400px]:py-1.5`;
const headerCard =
  "w-full min-w-0 border border-border bg-[rgba(28,28,28,0.95)] backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-[18px] py-[14px] rounded-[28px] relative z-10 max-[720px]:rounded-[22px] max-[720px]:p-4";
const modalBackdrop =
  "fixed inset-0 z-10 grid place-items-center p-5 bg-[rgba(51,34,23,0.4)] backdrop-blur-[10px]";
const modalCard =
  "w-[min(calc(100%_-_48px),520px)] rounded-[28px] border border-border bg-[#2a2a2a] shadow-[0_24px_60px_rgba(0,0,0,0.5)] p-6 grid gap-3 max-[720px]:w-full max-[720px]:max-w-[560px] max-[720px]:p-5 max-[720px]:rounded-[22px]";

type ModalBoundaryProps = {
  isOpen: boolean;
  onClose: () => void;
  loadingTitle: string;
  errorTitle: string;
  children: ReactNode;
};

function ModalFallback({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className={modalBackdrop}>
      <section className={modalCard} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grid gap-2">
          <h2 className="text-[1.2rem] leading-tight text-foreground">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </section>
    </div>
  );
}

function LazyModalBoundary({
  isOpen,
  onClose,
  loadingTitle,
  errorTitle,
  children,
}: ModalBoundaryProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <LazyViewBoundary
      loadingFallback={
        <ModalFallback
          title={loadingTitle}
          description="必要な画面を読み込んでいます。"
          onClose={onClose}
        />
      }
      errorFallback={
        <ModalFallback
          title={errorTitle}
          description="通信状況を確認してから、もう一度お試しください。"
          onClose={onClose}
        />
      }
    >
      {children}
    </LazyViewBoundary>
  );
}

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

      <LazyModalBoundary
        isOpen={addModal.isOpen}
        onClose={addModal.onClose}
        loadingTitle="作品追加の画面を開いています。"
        errorTitle="作品追加の画面を開けませんでした。"
      >
        <AddModal
          items={addModal.items}
          session={addModal.session}
          onClose={addModal.onClose}
          onOptimisticAdd={addModal.onOptimisticAdd}
          onRollbackOptimisticAdd={addModal.onRollbackOptimisticAdd}
          beginOptimisticUpdate={addModal.beginOptimisticUpdate}
          onAdded={addModal.onAdded}
        />
      </LazyModalBoundary>

      <LazyModalBoundary
        isOpen={detailModal.isOpen}
        onClose={detailModal.onClose}
        loadingTitle="作品詳細の画面を開いています。"
        errorTitle="作品詳細の画面を開けませんでした。"
      >
        <DetailModal
          item={detailModal.item}
          state={detailModal.state}
          items={detailModal.items}
          onStateChange={detailModal.onStateChange}
          onClose={detailModal.onClose}
          onReload={detailModal.onReload}
        />
      </LazyModalBoundary>

      {feedbackUi}
    </main>
  );
}
