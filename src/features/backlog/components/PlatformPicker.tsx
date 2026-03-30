import type { PrimaryPlatform } from "../types.ts";
import { platformBackgrounds, platformIcons, platformKeys, platformLabels } from "../constants.ts";

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
          style={{ background: platformBackgrounds[platform] }}
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
