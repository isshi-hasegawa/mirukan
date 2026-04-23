import { assert, assertEquals, assertRejects } from "jsr:@std/assert";
import {
  buildExpiresAt,
  isCacheEntryFresh,
  normalizeCachedSearchResult,
  readTmdbMetadataCache,
  writeTmdbMetadataCache,
} from "./cache.ts";
import { jsonResponse, withEnv, withMockFetch, withSupabaseAdminEnv } from "../test-helpers.ts";
import { _resetSupabaseAdminClientCacheForTesting } from "../supabase-admin.ts";

function futureIso(offsetMs = 60_000) {
  return new Date(Date.now() + offsetMs).toISOString();
}

Deno.test("TMDB cache helper は freshness と payload 正規化を判定する", () => {
  assertEquals(isCacheEntryFresh(null), false);
  assertEquals(isCacheEntryFresh("not-a-date"), false);
  assertEquals(isCacheEntryFresh(futureIso()), true);

  const expiresAt = buildExpiresAt(1_500);
  const expiresAtMs = Date.parse(expiresAt);
  assert(!Number.isNaN(expiresAtMs));
  assert(expiresAtMs > Date.now());

  const payload = { tmdbId: 100, tmdbMediaType: "movie" };
  assertEquals(normalizeCachedSearchResult(payload), payload);
  assertEquals(normalizeCachedSearchResult(null), null);
  assertEquals(normalizeCachedSearchResult("invalid"), null);
});

Deno.test("readTmdbMetadataCache は admin client が無ければ null を返す", async () => {
  _resetSupabaseAdminClientCacheForTesting();
  await withEnv({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }, async () => {
    assertEquals(await readTmdbMetadataCache("cache-key"), null);
  });
  _resetSupabaseAdminClientCacheForTesting();
});

Deno.test("readTmdbMetadataCache は Supabase REST から payload を読み出す", async () => {
  await withSupabaseAdminEnv(async () => {
    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);
        assertEquals(request.method, "GET");
        assertEquals(url.origin, "http://localhost:54321");
        assertEquals(url.pathname, "/rest/v1/tmdb_metadata_cache");
        assertEquals(url.searchParams.get("select"), "payload,expires_at");
        assertEquals(url.searchParams.get("cache_key"), "eq.cache-key");

        return jsonResponse({
          payload: { tmdbId: 101, tmdbMediaType: "movie" },
          expires_at: futureIso(),
        });
      },
      async () => {
        assertEquals(await readTmdbMetadataCache("cache-key"), {
          fresh: true,
          payload: { tmdbId: 101, tmdbMediaType: "movie" },
        });
      },
    );
  });
});

Deno.test("readTmdbMetadataCache は空レスポンスで null、エラーで例外を返す", async () => {
  await withSupabaseAdminEnv(async () => {
    let calls = 0;
    await withMockFetch(
      async (url, init) => {
        calls += 1;
        const request = new Request(url, init);
        assertEquals(request.method, "GET");

        if (calls === 1) {
          return jsonResponse([]);
        }

        return jsonResponse({ message: "boom" }, { status: 500 });
      },
      async () => {
        assertEquals(await readTmdbMetadataCache("cache-key"), null);
        await assertRejects(
          () => readTmdbMetadataCache("cache-key"),
          Error,
          "Failed to read TMDb metadata cache",
        );
      },
    );
  });
});

Deno.test("writeTmdbMetadataCache は Supabase REST へ upsert する", async () => {
  await withSupabaseAdminEnv(async () => {
    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);
        assertEquals(request.method, "POST");
        assertEquals(url.origin, "http://localhost:54321");
        assertEquals(url.pathname, "/rest/v1/tmdb_metadata_cache");

        const body = JSON.parse(await request.text()) as {
          cache_key: string;
          payload: unknown;
          fetched_at: string;
          expires_at: string;
        };
        assertEquals(body.cache_key, "watch-providers:movie:101:JP");
        assertEquals(body.payload, { foo: "bar" });
        assert(!Number.isNaN(Date.parse(body.fetched_at)));
        assert(Date.parse(body.expires_at) > Date.now());

        return jsonResponse([], { status: 201 });
      },
      async () => {
        await writeTmdbMetadataCache("watch-providers:movie:101:JP", { foo: "bar" });
      },
    );
  });
});

Deno.test("writeTmdbMetadataCache は Supabase エラーを例外に変換する", async () => {
  await withSupabaseAdminEnv(async () => {
    await withMockFetch(
      async () => jsonResponse({ message: "write failed" }, { status: 500 }),
      async () => {
        await assertRejects(
          () => writeTmdbMetadataCache("cache-key", { foo: "bar" }),
          Error,
          "Failed to write TMDb metadata cache",
        );
      },
    );
  });
});
