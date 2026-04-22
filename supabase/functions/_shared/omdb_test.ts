import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert";
import { extractRatings, fetchOmdbDetails, isDefinitiveOmdbMiss } from "./omdb.ts";
import { jsonResponse, withEnv, withMockFetch } from "./test-helpers.ts";

Deno.test("isDefinitiveOmdbMiss は未発見系エラーだけを true にする", () => {
  assertEquals(isDefinitiveOmdbMiss("Movie not found!"), true);
  assertEquals(isDefinitiveOmdbMiss("Series not found!"), true);
  assertEquals(isDefinitiveOmdbMiss("Episode not found!"), true);
  assertEquals(isDefinitiveOmdbMiss("Incorrect IMDb ID."), true);
  assertEquals(isDefinitiveOmdbMiss("Invalid API key!"), false);
  assertEquals(isDefinitiveOmdbMiss("Request limit reached!"), false);
});

Deno.test("extractRatings は確定的な未発見レスポンスを空スコアとして扱う", () => {
  assertEquals(
    extractRatings({
      Response: "False",
      Error: "Movie not found!",
    }),
    {
      rottenTomatoesScore: null,
      imdbRating: null,
      imdbVotes: null,
      metacriticScore: null,
    },
  );
});

Deno.test("extractRatings は一時障害を例外として返す", () => {
  assertThrows(
    () =>
      extractRatings({
        Response: "False",
        Error: "Request limit reached!",
      }),
    Error,
    "Request limit reached!",
  );
});

Deno.test("extractRatings は Error が未指定の失敗レスポンスでも例外を投げる", () => {
  assertThrows(
    () => extractRatings({ Response: "False" }),
    Error,
    "OMDb returned an error response",
  );
});

Deno.test("extractRatings は各 Source の評価値をパースする", () => {
  assertEquals(
    extractRatings({
      Response: "True",
      Ratings: [
        { Source: "Rotten Tomatoes", Value: "87%" },
        { Source: "Internet Movie Database", Value: "8.4/10" },
        { Source: "Metacritic", Value: "73/100" },
      ],
      imdbVotes: "1,234,567",
    }),
    {
      rottenTomatoesScore: 87,
      imdbRating: 8.4,
      imdbVotes: 1234567,
      metacriticScore: 73,
    },
  );
});

Deno.test("extractRatings は範囲外や未知フォーマットの値を null にする", () => {
  assertEquals(
    extractRatings({
      Response: "True",
      Ratings: [
        { Source: "Rotten Tomatoes", Value: "120%" },
        { Source: "Internet Movie Database", Value: "12/10" },
        { Source: "Metacritic", Value: "abc/100" },
        { Source: "Unknown Source", Value: "ignored" },
      ],
      imdbVotes: "not-a-number",
    }),
    {
      rottenTomatoesScore: null,
      imdbRating: null,
      imdbVotes: null,
      metacriticScore: null,
    },
  );
});

Deno.test("extractRatings は imdbRating が無いとき imdbVotes を無視する", () => {
  assertEquals(
    extractRatings({
      Response: "True",
      Ratings: [{ Source: "Rotten Tomatoes", Value: "50%" }],
      imdbVotes: "10,000",
    }),
    {
      rottenTomatoesScore: 50,
      imdbRating: null,
      imdbVotes: null,
      metacriticScore: null,
    },
  );
});

Deno.test("extractRatings は Ratings が未指定でも空結果を返す", () => {
  assertEquals(extractRatings({ Response: "True" }), {
    rottenTomatoesScore: null,
    imdbRating: null,
    imdbVotes: null,
    metacriticScore: null,
  });
});

Deno.test("fetchOmdbDetails は OMDb レスポンスを評価値に変換する", async () => {
  await withEnv({ OMDB_API_KEY: "test-key" }, async () => {
    await withMockFetch(
      (url) => {
        assertEquals(url.hostname, "www.omdbapi.com");
        assertEquals(url.searchParams.get("i"), "tt0133093");
        assertEquals(url.searchParams.get("apikey"), "test-key");
        return jsonResponse({
          Response: "True",
          Ratings: [{ Source: "Rotten Tomatoes", Value: "88%" }],
        });
      },
      async () => {
        const result = await fetchOmdbDetails("tt0133093");
        assertEquals(result.rottenTomatoesScore, 88);
      },
    );
  });
});

Deno.test("fetchOmdbDetails は OMDB_API_KEY 未設定で例外を投げる", async () => {
  await withEnv({ OMDB_API_KEY: undefined }, async () => {
    await assertRejects(() => fetchOmdbDetails("tt0000001"), Error, "OMDB_API_KEY");
  });
});

Deno.test("fetchOmdbDetails は非 2xx レスポンスで例外を投げる", async () => {
  await withEnv({ OMDB_API_KEY: "test-key" }, async () => {
    await withMockFetch(
      () => new Response("oops", { status: 503 }),
      async () => {
        await assertRejects(() => fetchOmdbDetails("tt0000001"), Error, "status 503");
      },
    );
  });
});
