import type {
  BacklogStatus,
  BoardMode,
  GamePlatform,
  PrimaryPlatform,
  ViewingMode,
} from "./types.ts";
import netflixUrl from "../../assets/icons/netflix.svg?url";
import primeVideoUrl from "../../assets/icons/prime_video.svg?url";
import unextUrl from "../../assets/icons/unext.svg?url";
import disneyPlusUrl from "../../assets/icons/disney_plus.svg?url";
import huluUrl from "../../assets/icons/hulu.svg?url";
import appleTvPlusUrl from "../../assets/icons/apple_tv_plus.svg?url";
import appleTvUrl from "../../assets/icons/apple_tv.svg?url";
import steamUrl from "../../assets/icons/steam.svg?url";
import playstationUrl from "../../assets/icons/playstation.svg?url";
import switchUrl from "../../assets/icons/switch.svg?url";
import xboxUrl from "../../assets/icons/xbox.svg?url";
import iosUrl from "../../assets/icons/ios.svg?url";
import androidUrl from "../../assets/icons/android.svg?url";
import gameWorkTypeUrl from "../../assets/icons/game_work.svg?url";

export const platformKeys = [
  "netflix",
  "prime_video",
  "u_next",
  "disney_plus",
  "hulu",
  "apple_tv_plus",
  "apple_tv",
] as const satisfies readonly Exclude<PrimaryPlatform, null>[];

type PlatformKey = (typeof platformKeys)[number];

export const statusOrder: BacklogStatus[] = [
  "stacked",
  "want_to_watch",
  "watching",
  "interrupted",
  "watched",
];

export const videoStatusLabels: Record<BacklogStatus, string> = {
  stacked: "ストック",
  want_to_watch: "見たい",
  watching: "視聴中",
  interrupted: "中断",
  watched: "視聴済み",
};

export const gameStatusLabels: Record<BacklogStatus, string> = {
  stacked: "積みゲー",
  want_to_watch: "プレイしたい",
  watching: "プレイ中",
  interrupted: "中断中",
  watched: "クリア済み",
};

export const statusLabels = videoStatusLabels;

export function getStatusLabel(status: BacklogStatus, boardMode: BoardMode) {
  return boardMode === "game" ? gameStatusLabels[status] : videoStatusLabels[status];
}

export const platformLabels: Record<PlatformKey, string> = {
  netflix: "Netflix",
  prime_video: "Prime Video",
  u_next: "U-NEXT",
  disney_plus: "Disney+",
  hulu: "Hulu",
  apple_tv_plus: "Apple TV+",
  apple_tv: "Apple TV",
};

export const platformIcons: Record<PlatformKey, string> = {
  netflix: netflixUrl,
  prime_video: primeVideoUrl,
  u_next: unextUrl,
  disney_plus: disneyPlusUrl,
  hulu: huluUrl,
  apple_tv_plus: appleTvPlusUrl,
  apple_tv: appleTvUrl,
};

export const platformBackgrounds: Record<PlatformKey, string> = {
  netflix: "#000",
  prime_video: "#fff",
  u_next: "#000",
  disney_plus: "linear-gradient(45deg, #00d6e8 0%, #084f60 50%, #112638 100%)",
  hulu: "#040405",
  apple_tv_plus: "#000",
  apple_tv: "#1d1d1f",
};

export function isPrimaryPlatformValue(value: unknown): value is PlatformKey {
  return typeof value === "string" && (platformKeys as ReadonlyArray<string>).includes(value);
}

export const gamePlatformKeys = [
  "steam",
  "playstation",
  "switch",
  "xbox",
  "ios",
  "android",
] as const satisfies readonly GamePlatform[];

type GamePlatformKey = (typeof gamePlatformKeys)[number];

export const gamePlatformLabels: Record<GamePlatformKey, string> = {
  steam: "Steam",
  playstation: "PlayStation",
  switch: "Switch",
  xbox: "Xbox",
  ios: "iOS",
  android: "Android",
};

export const gamePlatformIcons: Record<GamePlatformKey, string> = {
  steam: steamUrl,
  playstation: playstationUrl,
  switch: switchUrl,
  xbox: xboxUrl,
  ios: iosUrl,
  android: androidUrl,
};

export const gamePlatformBackgrounds: Record<GamePlatformKey, string> = {
  steam: "#101822",
  playstation: "#003087",
  switch: "#e60012",
  xbox: "#107c10",
  ios: "#111827",
  android: "#0f2b1d",
};

export const boardModeLabels: Record<BoardMode, string> = {
  video: "映像",
  game: "ゲーム",
};

export const workTypeIconUrls = {
  game: gameWorkTypeUrl,
} as const;

export const viewingModeOrder = [
  "focus",
  "thoughtful",
  "quick",
  "background",
] as const satisfies readonly ViewingMode[];

export const viewingModeLabels: Record<ViewingMode, string> = {
  focus: "ガッツリ",
  thoughtful: "じっくり",
  quick: "サクッと",
  background: "のんびり",
};

export const viewingModeDescriptions: Record<ViewingMode, string> = {
  focus: "集中して一本見たい",
  thoughtful: "そこそこ腰を据えて楽しむ",
  quick: "短時間でテンポよく",
  background: "流し見や作業のおともに",
};
