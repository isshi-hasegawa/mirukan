import { assertEquals, assertRejects } from "jsr:@std/assert";
import {
  buildIgdbDetailsBody,
  buildIgdbSearchBody,
  buildReleaseDatesByPlatform,
  callIgdbEndpoint,
  dedupePlatforms,
  fetchIgdbWorkDetails,
  type IgdbCallContext,
  mapIgdbPlatformSlug,
  searchIgdbWorks,
  selectInvolvedCompany,
  unixSecondsToIsoDate,
} from "./igdb.ts";

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

function createContext(
  fetchImpl: typeof fetch,
  options: { tokenSequence?: string[] } = {},
): { ctx: IgdbCallContext; tokenCalls: Array<{ force: boolean }> } {
  const tokenCalls: Array<{ force: boolean }> = [];
  const sequence = options.tokenSequence ?? ["token-1", "token-2"];
  return {
    ctx: {
      clientId: "test-client",
      fetchImpl,
      getAccessToken: async (force) => {
        tokenCalls.push({ force });
        return sequence[Math.min(tokenCalls.length, sequence.length) - 1];
      },
    },
    tokenCalls,
  };
}

Deno.test("mapIgdbPlatformSlug は既知 slug を GamePlatform に変換する", () => {
  assertEquals(mapIgdbPlatformSlug("win"), "steam");
  assertEquals(mapIgdbPlatformSlug("ps5"), "playstation");
  assertEquals(mapIgdbPlatformSlug("switch"), "switch");
  assertEquals(mapIgdbPlatformSlug("series-x"), "xbox");
  assertEquals(mapIgdbPlatformSlug("ios"), "ios");
  assertEquals(mapIgdbPlatformSlug("android"), "android");
  assertEquals(mapIgdbPlatformSlug("unknown"), null);
  assertEquals(mapIgdbPlatformSlug(null), null);
});

Deno.test("dedupePlatforms は順序を保ちつつ重複と null を除外する", () => {
  assertEquals(dedupePlatforms(["steam", "playstation", null, "steam", "switch", null]), [
    "steam",
    "playstation",
    "switch",
  ]);
});

Deno.test("unixSecondsToIsoDate は秒を YYYY-MM-DD に変換する", () => {
  assertEquals(unixSecondsToIsoDate(1700000000), "2023-11-14");
  assertEquals(unixSecondsToIsoDate(0), "1970-01-01");
  assertEquals(unixSecondsToIsoDate(null), null);
  assertEquals(unixSecondsToIsoDate(undefined), null);
  assertEquals(unixSecondsToIsoDate(Number.NaN), null);
});

Deno.test("buildIgdbSearchBody はクエリをエスケープしてカテゴリで絞る", () => {
  assertEquals(
    buildIgdbSearchBody('Zelda "BOTW"'),
    `fields id,name,summary,cover.image_id,first_release_date,platforms.slug; search "Zelda \\"BOTW\\""; where category = (0,8,9,10,11); limit 20;`,
  );
});

Deno.test("buildIgdbDetailsBody は id 検索を組み立てる", () => {
  const expected = `fields id,name,summary,cover.image_id,first_release_date,platforms.slug,release_dates.date,release_dates.platform.slug,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,franchise.name,franchises.name; where id = 1234; limit 1;`;
  assertEquals(buildIgdbDetailsBody(1234), expected);
});

Deno.test("selectInvolvedCompany は role 一致の最初の company name を返す", () => {
  assertEquals(
    selectInvolvedCompany(
      [
        { developer: false, publisher: true, company: { name: "Pub" } },
        { developer: true, publisher: false, company: { name: "Dev" } },
      ],
      "developer",
    ),
    "Dev",
  );
  assertEquals(selectInvolvedCompany([], "publisher"), null);
});

Deno.test("buildReleaseDatesByPlatform はプラットフォーム別最古日を採用する", () => {
  const result = buildReleaseDatesByPlatform([
    { date: 1700000000, platform: { slug: "ps5" } },
    { date: 1690000000, platform: { slug: "ps4" } },
    { date: 1680000000, platform: { slug: "win" } },
    { date: 1695000000, platform: { slug: "win" } },
    { date: 1700000000, platform: { slug: "unknown" } },
    { date: null, platform: { slug: "switch" } },
  ]);
  assertEquals(result, {
    playstation: "2023-07-22",
    steam: "2023-03-28",
  });
});

Deno.test("callIgdbEndpoint は 401 で 1 度だけ force refresh して再試行する", async () => {
  let calls = 0;
  const fetchImpl = (async (input: string | URL | Request) => {
    calls += 1;
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    assertEquals(url, "https://api.igdb.com/v4/games");
    if (calls === 1) {
      return new Response("Unauthorized", { status: 401 });
    }
    return jsonResponse([{ id: 1, name: "Sample" }]);
  }) as typeof fetch;

  const { ctx, tokenCalls } = createContext(fetchImpl);
  const result = await callIgdbEndpoint<Array<{ id: number; name: string }>>(
    ctx,
    "games",
    "fields id;",
  );

  assertEquals(result, [{ id: 1, name: "Sample" }]);
  assertEquals(calls, 2);
  assertEquals(tokenCalls, [{ force: false }, { force: true }]);
});

Deno.test("callIgdbEndpoint は連続 401 で例外を投げる", async () => {
  const fetchImpl = (async () => new Response("Unauthorized", { status: 401 })) as typeof fetch;
  const { ctx } = createContext(fetchImpl);
  await assertRejects(
    () => callIgdbEndpoint(ctx, "games", "fields id;"),
    Error,
    "IGDB games failed with status 401",
  );
});

Deno.test("searchIgdbWorks は IGDB レスポンスを IgdbSearchResult[] に変換する", async () => {
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    assertEquals(url, "https://api.igdb.com/v4/games");
    assertEquals(init?.method, "POST");
    return jsonResponse([
      {
        id: 11,
        name: "Title A",
        summary: "summary",
        cover: { image_id: "abc" },
        first_release_date: 1700000000,
        platforms: [{ slug: "win" }, { slug: "ps5" }, { slug: "unknown" }],
      },
      {
        id: 12,
        name: null,
      },
      {
        id: 13,
        name: "Title B",
      },
    ]);
  }) as typeof fetch;

  const { ctx } = createContext(fetchImpl);
  const result = await searchIgdbWorks("query", ctx);

  assertEquals(result, [
    {
      igdbId: 11,
      title: "Title A",
      coverImageId: "abc",
      releaseDate: "2023-11-14",
      platforms: ["steam", "playstation"],
      summary: "summary",
    },
    {
      igdbId: 13,
      title: "Title B",
      coverImageId: null,
      releaseDate: null,
      platforms: [],
      summary: null,
    },
  ]);
});

Deno.test("fetchIgdbWorkDetails はメタデータを集約して返す", async () => {
  const fetchImpl = (async () =>
    jsonResponse([
      {
        id: 21,
        name: "Detail Game",
        summary: "long summary",
        cover: { image_id: "xyz" },
        first_release_date: 1700000000,
        platforms: [{ slug: "switch" }, { slug: "win" }],
        release_dates: [
          { date: 1700000000, platform: { slug: "switch" } },
          { date: 1690000000, platform: { slug: "win" } },
        ],
        involved_companies: [
          { developer: true, publisher: false, company: { name: "Dev Co" } },
          { developer: false, publisher: true, company: { name: "Pub Co" } },
        ],
        franchise: { name: "Major Franchise" },
        franchises: [{ name: "Sub Franchise" }],
      },
    ])) as typeof fetch;

  const { ctx } = createContext(fetchImpl);
  const result = await fetchIgdbWorkDetails(21, ctx);

  assertEquals(result, {
    igdbId: 21,
    title: "Detail Game",
    summary: "long summary",
    coverImageId: "xyz",
    releaseDate: "2023-11-14",
    releaseDates: {
      switch: "2023-11-14",
      steam: "2023-07-22",
    },
    platforms: ["switch", "steam"],
    developer: "Dev Co",
    publisher: "Pub Co",
    franchise: "Major Franchise",
  });
});

Deno.test("fetchIgdbWorkDetails は空配列で例外を投げる", async () => {
  const fetchImpl = (async () => jsonResponse([])) as typeof fetch;
  const { ctx } = createContext(fetchImpl);
  await assertRejects(() => fetchIgdbWorkDetails(99, ctx), Error, "IGDB game 99 not found");
});
