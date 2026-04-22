const MINUTES_PER_UNIT = {
  d: 60 * 8,
  h: 60,
  min: 1,
} as const;

type EffortUnit = keyof typeof MINUTES_PER_UNIT;

// \b で単語境界にアンカーし、長い digit run の途中にマッチしないようにする
// (例: "1234567h" が "234567h" として誤解釈されるのを防ぐ)。
// 量化子は明示的に上限を付けて super-linear backtracking も防ぐ。
// SonarCloud の effort 文字列 (例: "2d 1h 30min") は小さい整数と最小限の空白で
// 表現されるため、6 桁 / 4 空白で十分な余白がある。
const EFFORT_TOKEN_PATTERN = /\b(\d{1,6})\s{0,4}(min|h|d)/g;

export function parseMeasureValue(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMinutes(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  let totalMinutes = 0;
  for (const match of value.matchAll(EFFORT_TOKEN_PATTERN)) {
    const amount = Number(match[1]);
    const unit = match[2] as EffortUnit;
    if (amount > 0) {
      totalMinutes += amount * MINUTES_PER_UNIT[unit];
    }
  }

  return totalMinutes > 0 ? totalMinutes : undefined;
}

export function normalizeComponentPath(component: string, projectKey: string): string {
  const prefix = `${projectKey}:`;
  return component.startsWith(prefix) ? component.slice(prefix.length) : component;
}

export function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
