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
  return (
    <div className="platform-picker" role="radiogroup" aria-label="視聴先">
      <label className={`platform-picker-item${value === "" ? " is-selected" : ""}`} title="未設定">
        <input
          type="radio"
          name="platform"
          value=""
          checked={value === ""}
          onChange={() => onChange("")}
        />
        <span className="platform-picker-none">—</span>
      </label>
      {PLATFORMS.map((platform) => (
        <label
          key={platform}
          data-platform={platform}
          className={`platform-picker-item${value === platform ? " is-selected" : ""}`}
          title={platformLabels[platform]}
        >
          <input
            type="radio"
            name="platform"
            value={platform}
            checked={value === platform}
            onChange={() => onChange(platform)}
          />
          <img src={PLATFORM_ICONS[platform]} alt={platformLabels[platform]} />
        </label>
      ))}
    </div>
  );
}
