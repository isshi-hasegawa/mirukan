import { assertEquals, assertThrows } from "jsr:@std/assert";
import { extractRatings, isDefinitiveOmdbMiss } from "./omdb.ts";

Deno.test("isDefinitiveOmdbMiss は未発見系エラーだけを true にする", () => {
  assertEquals(isDefinitiveOmdbMiss("Movie not found!"), true);
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
