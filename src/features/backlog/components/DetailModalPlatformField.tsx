import type { PrimaryPlatform } from "../types.ts";
import { PlatformPicker } from "./PlatformPicker.tsx";

type Props = Readonly<{
  value: PrimaryPlatform;
  onSelect: (value: PrimaryPlatform) => Promise<void>;
}>;

export function DetailModalPlatformField({ value, onSelect }: Props) {
  return <PlatformPicker value={value} onChange={(nextValue) => void onSelect(nextValue)} />;
}
