import type { PrimaryPlatform } from "../types.ts";
import { platformBackgrounds, platformIcons, platformLabels } from "../constants.ts";

type Props = Readonly<{
  platform: Exclude<PrimaryPlatform, null>;
}>;

export function PlatformIcon({ platform }: Props) {
  return (
    <img
      className="w-9 h-9 object-contain p-[6px] rounded-lg [background-clip:padding-box]"
      style={{ background: platformBackgrounds[platform] }}
      src={platformIcons[platform]}
      alt={platformLabels[platform]}
      title={platformLabels[platform]}
    />
  );
}
