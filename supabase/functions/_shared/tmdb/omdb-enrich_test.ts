import { assertEquals } from "jsr:@std/assert";
import { classifyImdbIdLookupResult } from "./omdb-enrich.ts";

Deno.test("classifyImdbIdLookupResult は IMDb lookup 結果を三値分類する", () => {
  assertEquals(classifyImdbIdLookupResult("tt0123456"), {
    kind: "found",
    imdbId: "tt0123456",
  });
  assertEquals(classifyImdbIdLookupResult(null), {
    kind: "missing",
  });
  assertEquals(classifyImdbIdLookupResult(undefined), {
    kind: "unavailable",
  });
  assertEquals(classifyImdbIdLookupResult("   "), {
    kind: "unavailable",
  });
});
