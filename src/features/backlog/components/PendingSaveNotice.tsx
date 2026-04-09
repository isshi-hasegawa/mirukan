import { Button } from "@/components/ui/button.tsx";

type Props = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PendingSaveNotice({ message, onConfirm, onCancel }: Props) {
  return (
    <div className="rounded-[20px] border border-[rgba(191,90,54,0.35)] bg-[rgba(191,90,54,0.08)] px-3.5 py-3">
      <p className="text-sm leading-6 text-foreground">{message}</p>
      <div className="mt-3 flex justify-end gap-2.5">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="button" onClick={onConfirm}>
          ストックへ戻す
        </Button>
      </div>
    </div>
  );
}
