import { jsonResponse, withEnv, withSupabaseAdminEnv } from "../test-helpers.ts";

export function futureIso(offsetMs = 60_000) {
  return new Date(Date.now() + offsetMs).toISOString();
}

export function pastIso(offsetMs = 60_000) {
  return new Date(Date.now() - offsetMs).toISOString();
}

export async function withSupabaseTmdbEnv(
  run: () => Promise<void>,
  options: { omdbApiKey?: string | undefined } = {},
) {
  await withEnv(
    {
      TMDB_API_KEY: "tmdb-test-key",
      OMDB_API_KEY: options.omdbApiKey,
    },
    () => withSupabaseAdminEnv(run),
  );
}

export function respondWithEmptyMetadataCache(url: URL, request: Request): Response | null {
  if (url.pathname !== "/rest/v1/tmdb_metadata_cache") {
    return null;
  }

  if (request.method === "GET") {
    return jsonResponse([]);
  }

  if (request.method === "POST") {
    return jsonResponse([], { status: 201 });
  }

  return null;
}
