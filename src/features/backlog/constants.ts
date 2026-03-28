import type { BacklogStatus, PrimaryPlatform } from "./types.ts";

export const statusOrder: BacklogStatus[] = [
  "stacked",
  "want_to_watch",
  "watching",
  "interrupted",
  "watched",
];

export const statusLabels: Record<BacklogStatus, string> = {
  stacked: "積み",
  want_to_watch: "見たい",
  watching: "視聴中",
  interrupted: "中断",
  watched: "視聴済み",
};

export const statusDescriptions: Record<BacklogStatus, string> = {
  stacked: "あとで見る候補を雑多に積んでおく列",
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
  apple_tv_plus: "Apple TV+",
  theater: "劇場",
  other: "その他",
};
