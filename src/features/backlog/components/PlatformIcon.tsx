import type { PrimaryPlatform } from "../types.ts";
import { platformIcons, platformLabels } from "../constants.ts";

type Props = {
  platform: Exclude<PrimaryPlatform, null>;
};

export function PlatformIcon({ platform }: Props) {
  return (
    <img
      className="platform-icon"
      data-platform={platform}
      src={platformIcons[platform]}
      alt={platformLabels[platform]}
      title={platformLabels[platform]}
    />
  );
}
