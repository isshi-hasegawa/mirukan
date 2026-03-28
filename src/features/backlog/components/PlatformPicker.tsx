import type { PrimaryPlatform } from "../types.ts";
import { platformIcons, platformKeys, platformLabels } from "../constants.ts";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function PlatformPicker({ value, onChange }: Props) {
  const handlePlatformClick = (platform: Exclude<PrimaryPlatform, null>) => {
    onChange(value === platform ? "" : platform);
  };

  return (
    <div className="platform-picker" role="group" aria-label="視聴先">
      {platformKeys.map((platform) => (
        <button
          key={platform}
          type="button"
          data-platform={platform}
          className={`platform-picker-item${value === platform ? " is-selected" : ""}`}
          title={platformLabels[platform]}
          onClick={() => handlePlatformClick(platform)}
        >
          <img src={platformIcons[platform]} alt={platformLabels[platform]} />
        </button>
      ))}
    </div>
  );
}
