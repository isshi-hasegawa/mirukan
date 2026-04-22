import { assert, assertEquals, assertStrictEquals } from "jsr:@std/assert";
import {
  _resetSupabaseAdminClientCacheForTesting,
  getSupabaseAdminClient,
} from "./supabase-admin.ts";
import { withEnv } from "./test-helpers.ts";

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
