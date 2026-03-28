import type { BacklogStatus, PrimaryPlatform } from "./types.ts";

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

// TMDb provider logo paths (static mapping for primary_platform display)
// Note: These are from known TMDb provider IDs
export const platformLogoPaths: Record<Exclude<PrimaryPlatform, null>, string | null> = {
  netflix: "/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg",
  prime_video: "/emjlyngmlVoGRT6FYvoCHx.jpg",
  disney_plus: "/oVd7SmMjPvOtr5czt5XN8bFsS7Y.jpg",
  hulu: "/Ixsvboz3gzcYEkxBPFk9L.jpg",
  apple_tv_plus: "/p3Z0rC08Lv1htnKKVEw5d72cgH9.jpg",
  apple_tv: "/uI2OGT8F0SJb1hEPkjgKtBYdEJZ.jpg",
  u_next: null, // To be confirmed
};
