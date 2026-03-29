import type { PrimaryPlatform } from "../types.ts";
import { platformIcons, platformLabels } from "../constants.ts";

const platformBg: Partial<Record<string, string>> = {
  netflix: "#000",
  prime_video: "#fff",
  u_next: "#000",
  disney_plus: "linear-gradient(45deg, #00d6e8 0%, #084f60 50%, #112638 100%)",
  hulu: "#040405",
  apple_tv_plus: "#000",
  apple_tv: "#1d1d1f",
};

type Props = {
  platform: Exclude<PrimaryPlatform, null>;
};

export function PlatformIcon({ platform }: Props) {
  return (
    <img
      className="w-9 h-9 object-contain p-[6px] rounded-lg [background-clip:padding-box]"
      style={{ background: platformBg[platform] ?? "#888" }}
      src={platformIcons[platform]}
      alt={platformLabels[platform]}
      title={platformLabels[platform]}
    />
  );
}
