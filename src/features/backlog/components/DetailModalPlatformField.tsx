import { PlatformPicker } from "./PlatformPicker.tsx";

type Props = {
  value: string | null;
  onSelect: (value: string) => Promise<void>;
};

export function DetailModalPlatformField({ value, onSelect }: Props) {
  return <PlatformPicker value={value ?? ""} onChange={(nextValue) => void onSelect(nextValue)} />;
}
