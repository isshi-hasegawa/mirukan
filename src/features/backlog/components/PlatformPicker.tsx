import type { PrimaryPlatform } from "../types.ts";
import { platformIcons, platformKeys, platformLabels } from "../constants.ts";

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
  value: string;
  onChange: (value: string) => void;
};

export function PlatformPicker({ value, onChange }: Props) {
  const handlePlatformClick = (platform: Exclude<PrimaryPlatform, null>) => {
    onChange(value === platform ? "" : platform);
  };

  return (
    <div className="flex gap-2 flex-wrap" role="group" aria-label="視聴先">
      {platformKeys.map((platform) => (
        <button
          key={platform}
          type="button"
          className={`relative w-11 h-11 flex items-center justify-center rounded-lg overflow-hidden cursor-pointer border-none [background-clip:padding-box] transition-shadow${value === platform ? " ring-2 ring-primary ring-inset" : ""}`}
          style={{ background: platformBg[platform] ?? "#888" }}
          title={platformLabels[platform]}
          onClick={() => handlePlatformClick(platform)}
        >
          <img
            src={platformIcons[platform]}
            alt={platformLabels[platform]}
            className="block w-9 h-9 object-contain p-[3px]"
          />
        </button>
      ))}
    </div>
  );
}
