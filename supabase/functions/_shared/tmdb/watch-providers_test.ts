import { assertEquals } from "jsr:@std/assert";
import { checkJapaneseReleaseCached, fetchWatchProvidersJP } from "./watch-providers.ts";
import { futureIso, pastIso, withSupabaseTmdbEnv } from "./test-helpers.ts";
import { jsonResponse, withMockFetch, withSupabaseAdminEnv } from "../test-helpers.ts";

Deno.test("fetchWatchProvidersJP は fresh cache を正規化して返す", async () => {
  await withSupabaseAdminEnv(async () => {
    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);
        assertEquals(request.method, "GET");
        assertEquals(url.pathname, "/rest/v1/tmdb_metadata_cache");
        assertEquals(url.searchParams.get("cache_key"), "eq.watch-providers:movie:101:JP");

        return jsonResponse({
          payload: [
            null,
            { key: "netflix", logoPath: "/netflix.png" },
            { key: "prime_video", logoPath: null },
            { logoPath: "/missing.png" },
          ],
          expires_at: futureIso(),
        });
      },
      async () => {
        assertEquals(await fetchWatchProvidersJP(101, "movie"), [
          { key: "netflix", logoPath: "/netflix.png" },
          { key: "prime_video", logoPath: null },
        ]);
      },
    );
  });
});

Deno.test("fetchWatchProvidersJP は stale cache から TMDB を引き直して metadata cache を更新する", async () => {
  await withSupabaseTmdbEnv(async () => {
    const writes: Array<{ cache_key: string; payload: unknown }> = [];

    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);

        if (url.pathname === "/rest/v1/tmdb_metadata_cache" && request.method === "GET") {
          return jsonResponse({
            payload: [{ key: "u_next", logoPath: "/old.png" }],
            expires_at: pastIso(),
          });
        }

        if (url.pathname === "/rest/v1/tmdb_metadata_cache" && request.method === "POST") {
          writes.push(
            JSON.parse(await request.text()) as {
              cache_key: string;
              payload: unknown;
            },
          );
          return jsonResponse([], { status: 201 });
        }

        if (
          url.hostname === "api.themoviedb.org" &&
          url.pathname === "/3/movie/101/watch/providers"
        ) {
          return jsonResponse({
            results: {
              JP: {
                flatrate: [
                  { provider_id: 97, provider_name: "U-NEXT", logo_path: "/u-next.png" },
                  { provider_id: 97, provider_name: "U-NEXT", logo_path: "/u-next-dup.png" },
                  { provider_id: 337, provider_name: "Disney+", logo_path: null },
                  { provider_id: 999, provider_name: "Unknown", logo_path: "/ignore.png" },
                ],
              },
            },
          });
        }

        throw new Error(`Unhandled fetch: ${request.method} ${url.toString()}`);
      },
      async () => {
        assertEquals(await fetchWatchProvidersJP(101, "movie"), [
          { key: "u_next", logoPath: "/u-next.png" },
          { key: "disney_plus", logoPath: null },
        ]);
        assertEquals(
          writes.map(({ cache_key, payload }) => ({ cache_key, payload })),
          [
            {
              cache_key: "watch-providers:movie:101:JP",
              payload: [
                { key: "u_next", logoPath: "/u-next.png" },
                { key: "disney_plus", logoPath: null },
              ],
            },
          ],
        );
      },
    );
  });
});

Deno.test("checkJapaneseReleaseCached は fresh cache の boolean を返す", async () => {
  await withSupabaseAdminEnv(async () => {
    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);
        assertEquals(request.method, "GET");
        assertEquals(url.pathname, "/rest/v1/tmdb_metadata_cache");
        assertEquals(url.searchParams.get("cache_key"), "eq.jp-release:movie:31");

        return jsonResponse({
          payload: false,
          expires_at: futureIso(),
        });
      },
      async () => {
        assertEquals(await checkJapaneseReleaseCached(31), false);
      },
    );
  });
});

Deno.test("checkJapaneseReleaseCached は release_dates 取得失敗時に true を返して書き戻す", async () => {
  await withSupabaseTmdbEnv(async () => {
    const writes: Array<{ cache_key: string; payload: unknown }> = [];

    await withMockFetch(
      async (url, init) => {
        const request = new Request(url, init);

        if (url.pathname === "/rest/v1/tmdb_metadata_cache" && request.method === "GET") {
          return jsonResponse({
            payload: "invalid",
            expires_at: pastIso(),
          });
        }

        if (url.pathname === "/rest/v1/tmdb_metadata_cache" && request.method === "POST") {
          writes.push(
            JSON.parse(await request.text()) as {
              cache_key: string;
              payload: unknown;
            },
          );
          return jsonResponse([], { status: 201 });
        }

        if (url.hostname === "api.themoviedb.org" && url.pathname === "/3/movie/31/release_dates") {
          throw new Error("tmdb down");
        }

        throw new Error(`Unhandled fetch: ${request.method} ${url.toString()}`);
      },
      async () => {
        assertEquals(await checkJapaneseReleaseCached(31), true);
        assertEquals(
          writes.map(({ cache_key, payload }) => ({ cache_key, payload })),
          [{ cache_key: "jp-release:movie:31", payload: true }],
        );
      },
    );
  });
});
