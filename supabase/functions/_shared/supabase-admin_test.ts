import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import {
  _resetSupabaseAdminClientCacheForTesting,
  getSupabaseAdminClient,
} from "./supabase-admin.ts";

async function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, Deno.env.get(key));
    if (value === undefined) {
      Deno.env.delete(key);
    } else {
      Deno.env.set(key, value);
    }
  }

  try {
    await run();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  }
}

Deno.test("getSupabaseAdminClient は SUPABASE_URL が無ければ null を返す", async () => {
  _resetSupabaseAdminClientCacheForTesting();
  await withEnv({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: "role-key" }, async () => {
    assertEquals(getSupabaseAdminClient(), null);
  });
  _resetSupabaseAdminClientCacheForTesting();
});

Deno.test("getSupabaseAdminClient は SERVICE_ROLE_KEY が無ければ null を返す", async () => {
  _resetSupabaseAdminClientCacheForTesting();
  await withEnv(
    { SUPABASE_URL: "http://localhost:54321", SUPABASE_SERVICE_ROLE_KEY: undefined },
    async () => {
      assertEquals(getSupabaseAdminClient(), null);
    },
  );
  _resetSupabaseAdminClientCacheForTesting();
});

Deno.test("getSupabaseAdminClient は環境変数が揃えばクライアントを生成してキャッシュする", async () => {
  _resetSupabaseAdminClientCacheForTesting();
  await withEnv(
    {
      SUPABASE_URL: "http://localhost:54321",
      SUPABASE_SERVICE_ROLE_KEY: "role-key",
    },
    async () => {
      const first = getSupabaseAdminClient();
      assert(first !== null);
      const second = getSupabaseAdminClient();
      assertStrictEquals(second, first);
    },
  );
  _resetSupabaseAdminClientCacheForTesting();
});
