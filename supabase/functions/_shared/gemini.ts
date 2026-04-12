import { getSupabaseAdminClient } from "./supabase-admin.ts";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type GeminiCacheRow = {
  payload: { value: string | null };
  expires_at: string | null;
};

function buildExpiresAt(ttlMs: number) {
  return new Date(Date.now() + ttlMs).toISOString();
}

function isCacheEntryFresh(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = Date.parse(expiresAt);
  return !Number.isNaN(expiresAtMs) && expiresAtMs > Date.now();
}

function normalizeCacheSegment(value: string) {
  return value.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function buildCacheKey(prefix: string, value: string) {
  return `gemini:${prefix}:v1:${normalizeCacheSegment(value)}`;
}

async function readGeminiCache(
  cacheKey: string,
): Promise<{ fresh: boolean; payload: string | null } | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin
    .from("tmdb_metadata_cache")
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle<GeminiCacheRow>();

  if (error || !data) {
    return null;
  }

  return {
    fresh: isCacheEntryFresh(data.expires_at),
    payload: data.payload.value,
  };
}

async function writeGeminiCache(cacheKey: string, value: string | null) {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return;
  }

  // payload は jsonb NOT NULL のため { value } でラップして null を格納可能にする
  await admin.from("tmdb_metadata_cache").upsert({
    cache_key: cacheKey,
    payload: { value },
    fetched_at: new Date().toISOString(),
    expires_at: buildExpiresAt(GEMINI_CACHE_TTL_MS),
  });
}

function getGeminiApiKey() {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  return apiKey?.trim() ? apiKey.trim() : null;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
}

async function generateGeminiJson(prompt: string): Promise<Record<string, unknown> | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.find(
    (part) => typeof part.text === "string",
  )?.text;

  return text ? extractJsonObject(text) : null;
}

function hasJapaneseText(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

export async function translateSearchQuery(query: string): Promise<string | null> {
  const normalized = query.trim();
  if (!normalized || !hasJapaneseText(normalized)) {
    return null;
  }

  const cacheKey = buildCacheKey("translate-search-query", normalized);
  const cached = await readGeminiCache(cacheKey);
  if (cached?.fresh) {
    return cached.payload?.trim() || null;
  }

  const result = await generateGeminiJson(
    [
      "You convert Japanese movie or TV search queries into concise English TMDb search queries.",
      'Return strict JSON only in the form {"query": string|null}.',
      "If the input is already best searched as-is, ambiguous, or you are not confident, return null.",
      `Input: ${JSON.stringify(normalized)}`,
    ].join("\n"),
  );
  if (result === null) {
    // Gemini 呼び出し失敗（一時的エラー）はキャッシュしない
    return null;
  }
  const translated =
    typeof result.query === "string" && result.query.trim() ? result.query.trim() : null;
  const sanitized =
    translated && translated.toLowerCase() !== normalized.toLowerCase() ? translated : null;

  await writeGeminiCache(cacheKey, sanitized);
  return sanitized;
}

type SuggestDisplayTitleInput = {
  title: string;
  originalTitle: string | null;
  workType: "movie" | "series";
};

export async function suggestDisplayTitle({
  title,
  originalTitle,
  workType,
}: SuggestDisplayTitleInput): Promise<string | null> {
  const normalizedTitle = title.trim();
  const normalizedOriginalTitle = originalTitle?.trim() || null;
  if (!normalizedTitle) {
    return null;
  }

  const cacheKey = buildCacheKey(
    "suggest-display-title",
    `${workType}:${normalizedTitle}:${normalizedOriginalTitle ?? ""}`,
  );
  const cached = await readGeminiCache(cacheKey);
  if (cached?.fresh) {
    return cached.payload?.trim() || null;
  }

  const result = await generateGeminiJson(
    [
      "You propose a natural Japanese display title for a movie or TV series backlog app.",
      'Return strict JSON only in the form {"title": string|null}.',
      "If the existing title is already an appropriate Japanese display title, or you are not confident, return null.",
      `Work type: ${workType}`,
      `Current title: ${JSON.stringify(normalizedTitle)}`,
      `Original title: ${JSON.stringify(normalizedOriginalTitle)}`,
    ].join("\n"),
  );
  if (result === null) {
    // Gemini 呼び出し失敗（一時的エラー）はキャッシュしない
    return null;
  }
  const suggested =
    typeof result.title === "string" && result.title.trim() ? result.title.trim() : null;
  const sanitized = suggested && suggested !== normalizedTitle ? suggested : null;

  await writeGeminiCache(cacheKey, sanitized);
  return sanitized;
}
