import { setupTestLifecycle } from "../test/test-lifecycle.ts";
import { fetchOmdbWorkDetails } from "./omdb.ts";

const supabaseMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("./supabase.ts", () => ({
  supabase: {
    functions: {
      invoke: supabaseMocks.invoke,
    },
  },
}));

setupTestLifecycle();

describe("fetchOmdbWorkDetails", () => {
  beforeEach(() => {
    supabaseMocks.invoke.mockReset();
  });

  test("Edge Function の結果を返す", async () => {
    supabaseMocks.invoke.mockResolvedValue({
      data: {
        rottenTomatoesScore: 91,
        imdbRating: 7.8,
        imdbVotes: 12345,
        metacriticScore: 76,
      },
      error: null,
    });

    await expect(fetchOmdbWorkDetails("tt0111161")).resolves.toEqual({
      rottenTomatoesScore: 91,
      imdbRating: 7.8,
      imdbVotes: 12345,
      metacriticScore: 76,
    });
    expect(supabaseMocks.invoke).toHaveBeenCalledWith("fetch-omdb-work-details", {
      body: { imdbId: "tt0111161" },
    });
  });

  test("Edge Function エラーを例外化する", async () => {
    supabaseMocks.invoke.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });

    await expect(fetchOmdbWorkDetails("tt0111161")).rejects.toThrow(
      "Supabase function fetch-omdb-work-details failed: boom",
    );
  });
});
