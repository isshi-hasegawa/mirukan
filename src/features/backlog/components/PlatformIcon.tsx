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

type Props = {
  platform: Exclude<PrimaryPlatform, null>;
};

export function PlatformIcon({ platform }: Props) {
  return (
    <img
      className="platform-icon"
      src={PLATFORM_ICONS[platform]}
      alt={platformLabels[platform]}
      title={platformLabels[platform]}
    />
  );
}
