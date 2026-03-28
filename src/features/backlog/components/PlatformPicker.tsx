import type { PrimaryPlatform } from "../types.ts";
import { platformLabels } from "../constants.ts";
import netflixUrl from "../../../assets/icons/netflix.svg?url";
import primeVideoUrl from "../../../assets/icons/prime_video.svg?url";
import unextUrl from "../../../assets/icons/unext.svg?url";
import disneyPlusUrl from "../../../assets/icons/disney_plus.svg?url";
import huluUrl from "../../../assets/icons/hulu.svg?url";
import appleTvPlusUrl from "../../../assets/icons/apple_tv_plus.svg?url";
import appleTvUrl from "../../../assets/icons/apple_tv.svg?url";

const PLATFORM_ICONS: Record<Exclude<PrimaryPlatform, null>, string> = {
  netflix: netflixUrl,
  prime_video: primeVideoUrl,
  u_next: unextUrl,
  disney_plus: disneyPlusUrl,
  hulu: huluUrl,
  apple_tv_plus: appleTvPlusUrl,
  apple_tv: appleTvUrl,
};

const PLATFORMS = Object.keys(PLATFORM_ICONS) as Exclude<PrimaryPlatform, null>[];

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
      {PLATFORMS.map((platform) => (
        <button
          key={platform}
          type="button"
          data-platform={platform}
          className={`platform-picker-item${value === platform ? " is-selected" : ""}`}
          title={platformLabels[platform]}
          onClick={() => handlePlatformClick(platform)}
        >
          <img src={PLATFORM_ICONS[platform]} alt={platformLabels[platform]} />
        </button>
      ))}
    </div>
  );
}
