import type { BacklogStatus, PrimaryPlatform, ViewingMode } from "./types.ts";
import netflixUrl from "../../assets/icons/netflix.svg?url";
import primeVideoUrl from "../../assets/icons/prime_video.svg?url";
import unextUrl from "../../assets/icons/unext.svg?url";
import disneyPlusUrl from "../../assets/icons/disney_plus.svg?url";
import huluUrl from "../../assets/icons/hulu.svg?url";
import appleTvPlusUrl from "../../assets/icons/apple_tv_plus.svg?url";
import appleTvUrl from "../../assets/icons/apple_tv.svg?url";

export const statusOrder: BacklogStatus[] = [
  "stacked",
  "want_to_watch",
  "watching",
  "interrupted",
  "watched",
];

export const statusLabels: Record<BacklogStatus, string> = {
  stacked: "ストック",
  want_to_watch: "見たい",
  watching: "視聴中",
  interrupted: "中断",
  watched: "視聴済み",
};

export const statusDescriptions: Record<BacklogStatus, string> = {
  stacked: "あとで見る候補をストックしておく列",
  want_to_watch: "近いうちに見る候補を寄せる列",
  watching: "いま進行中として扱う列",
  interrupted: "止まっているけれど終えていない列",
  watched: "見終わったものを残しておく列",
};

export const platformLabels: Record<Exclude<PrimaryPlatform, null>, string> = {
  netflix: "Netflix",
  prime_video: "Prime Video",
  u_next: "U-NEXT",
  disney_plus: "Disney+",
  hulu: "Hulu",
  apple_tv_plus: "Apple TV+",
  apple_tv: "Apple TV",
};

export const platformIcons: Record<Exclude<PrimaryPlatform, null>, string> = {
  netflix: netflixUrl,
  prime_video: primeVideoUrl,
  u_next: unextUrl,
  disney_plus: disneyPlusUrl,
  hulu: huluUrl,
  apple_tv_plus: appleTvPlusUrl,
  apple_tv: appleTvUrl,
};

export const platformKeys = Object.keys(platformIcons) as Exclude<PrimaryPlatform, null>[];

export const platformBackgrounds: Record<Exclude<PrimaryPlatform, null>, string> = {
  netflix: "#000",
  prime_video: "#fff",
  u_next: "#000",
  disney_plus: "linear-gradient(45deg, #00d6e8 0%, #084f60 50%, #112638 100%)",
  hulu: "#040405",
  apple_tv_plus: "#000",
  apple_tv: "#1d1d1f",
};

export const viewingModeOrder: ViewingMode[] = ["focus", "thoughtful", "quick", "background"];

export const viewingModeLabels: Record<ViewingMode, string> = {
  focus: "ガッツリ",
  thoughtful: "じっくり",
  quick: "サクッと",
  background: "のんびり",
};
