import { expect, test } from "@playwright/test";
import { login, openAddModal } from "../support/app.ts";

test("TMDb 検索結果を選ぶと詳細ペインへ反映される", async ({ page }) => {
  await page.route("**/functions/v1/fetch-tmdb-similar", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  await page.route("**/functions/v1/fetch-tmdb-trending", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          tmdbId: 777001,
          tmdbMediaType: "movie",
          workType: "movie",
          title: "おすすめ作品",
          originalTitle: "Recommended Work",
          overview: "initial recommendation",
          posterPath: null,
          releaseDate: "2024-01-01",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
      ]),
    });
  });

  await page.route("**/functions/v1/search-tmdb-works", async (route) => {
    const request = route.request();
    const postData = request.postDataJSON() as { query?: string } | null;
    const query = postData?.query ?? "";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          tmdbId: 777002,
          tmdbMediaType: "movie",
          workType: "movie",
          title: `検索結果 ${query}`.trim(),
          originalTitle: "Search Result",
          overview: "search result overview",
          posterPath: null,
          releaseDate: "2025-02-02",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
      ]),
    });
  });

  await login(page);
  await openAddModal(page);

  await expect(page.getByRole("button", { name: /おすすめ作品/ })).toBeVisible();

  await page.getByPlaceholder("作品名で検索").fill("QA regression");

  const searchResult = page.getByRole("button", { name: /検索結果 QA regression/ });
  await expect(searchResult).toBeVisible();
  await searchResult.click();

  await expect(page.getByLabel("タイトル")).toHaveValue("検索結果 QA regression");
  await expect(page.getByRole("button", { name: "シーズン1" })).toHaveCount(0);
  await expect(page.locator('button[type="submit"]')).toHaveText("ストックに追加");
});
