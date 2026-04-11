const REPO_PATH_SEGMENTS = ["src/", "supabase/", ".github/", "docs/", "public/"] as const;

export function matchesAnyPattern(path: string, patterns: readonly string[]) {
  return patterns.some((pattern) => matchesGlobPattern(path, pattern));
}

export function sanitizeAbsolutePaths(value: string) {
  return value.replaceAll(
    /(^|[\s("'`[])(\/[^\s"'`)\]]*)/g,
    (fullMatch, prefix: string, candidate: string) => {
      const { path, suffix } = splitTrailingPunctuation(candidate);
      const sanitized = toDisplayPath(path);
      return sanitized === path ? fullMatch : `${prefix}${sanitized}${suffix}`;
    },
  );
}

export function toDisplayPath(value: string) {
  const normalized = normalizePathForMatch(value);
  if (!normalized.startsWith("/")) {
    return normalized;
  }

  const repoRelative = stripRepoPrefix(normalized);
  if (repoRelative !== null) {
    return repoRelative;
  }

  if (normalized.endsWith("/pnpm-lock.yaml")) {
    return "pnpm-lock.yaml";
  }

  return normalized.split("/").findLast(Boolean) ?? normalized;
}

function matchesGlobPattern(path: string, pattern: string) {
  const normalizedPath = normalizePathForMatch(path);
  const normalizedPattern = normalizePathForMatch(pattern);
  const source = normalizedPattern
    .replaceAll(/[|\\{}()[\]^$+?.]/g, String.raw`\$&`)
    .replaceAll(/\*\*/g, "__DOUBLE_STAR__")
    .replaceAll(/\*/g, "[^/]*")
    .replaceAll(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${source}$`).test(normalizedPath);
}

function normalizePathForMatch(value: string) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function stripRepoPrefix(normalizedPath: string): string | null {
  for (const segment of REPO_PATH_SEGMENTS) {
    const marker = `/${segment}`;
    const index = normalizedPath.lastIndexOf(marker);
    if (index >= 0) {
      return normalizedPath.slice(index + 1);
    }
  }

  return null;
}

function splitTrailingPunctuation(value: string) {
  let index = value.length;

  while (index > 0 && isTrailingPunctuation(value[index - 1])) {
    index -= 1;
  }

  return {
    path: value.slice(0, index),
    suffix: value.slice(index),
  };
}

function isTrailingPunctuation(value: string) {
  return (
    value === "." ||
    value === "," ||
    value === ":" ||
    value === ";" ||
    value === "!" ||
    value === "?"
  );
}
