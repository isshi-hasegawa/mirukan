import { expect, test } from "@playwright/test";
import { openAddModal } from "../support/app.ts";

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

  await page.goto("/");
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

test("TV シリーズを選ぶと複数シーズンをストックへ追加できる", async ({ page }, testInfo) => {
  const tmdbId = 880000 + testInfo.workerIndex;
  const title = `新作シリーズ ${Date.now()}`;
  const seasonTitle = `${title} シーズン2`;

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
      body: "[]",
    });
  });

  await page.route("**/functions/v1/search-tmdb-works", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          tmdbId,
          tmdbMediaType: "tv",
          workType: "series",
          title,
          originalTitle: `${title} Original`,
          overview: "series overview",
          posterPath: null,
          releaseDate: "2025-04-01",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
      ]),
    });
  });

  await page.route("**/functions/v1/fetch-tmdb-season-options", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          seasonNumber: 2,
          title: seasonTitle,
          overview: "season overview",
          posterPath: null,
          releaseDate: "2025-04-08",
          episodeCount: 8,
        },
      ]),
    });
  });

  await page.goto("/");
  await openAddModal(page);
  const addDialog = page.getByRole("dialog", { name: "作品を追加" });

  await addDialog.getByPlaceholder("作品名で検索").fill(title);

  const searchResult = addDialog.getByRole("button", { name: new RegExp(title) });
  await expect(searchResult).toBeVisible();
  await searchResult.click();

  const season1Button = addDialog.getByRole("button", { name: "シーズン1" });
  const season2Button = addDialog.getByRole("button", { name: "シーズン2 8話" });
  await expect(season1Button).toHaveAttribute("aria-pressed", "true");
  await expect(season2Button).toBeVisible();

  await season2Button.click();
  await expect(season2Button).toHaveAttribute("aria-pressed", "true");

  const saveResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/rest/v1/backlog_items") &&
      response.ok(),
  );
  await addDialog.getByRole("button", { name: "ストックに追加" }).click();
  await saveResponse;

  await expect(page.getByRole("dialog", { name: "作品を追加" })).not.toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByText(seasonTitle, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  await expect(page.getByText(seasonTitle, { exact: true })).toBeVisible();
});

test("既存作品の追加ではストックへ戻す確認をモーダル内に表示する", async ({ page }) => {
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
      body: "[]",
    });
  });

  await page.route("**/functions/v1/search-tmdb-works", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          tmdbId: 603,
          tmdbMediaType: "movie",
          workType: "movie",
          title: "マトリックス",
          originalTitle: "The Matrix",
          overview: "matrix overview",
          posterPath: null,
          releaseDate: "1999-03-31",
          jpWatchPlatforms: [],
          hasJapaneseRelease: true,
        },
      ]),
    });
  });

  await page.goto("/");
  await openAddModal(page);
  const addDialog = page.getByRole("dialog", { name: "作品を追加" });

  await addDialog.getByPlaceholder("作品名で検索").fill("マトリックス");

  const searchResult = addDialog.getByRole("button", { name: /マトリックス/ });
  await expect(searchResult).toBeVisible();
  await searchResult.click();

  await addDialog.getByRole("button", { name: "ストックに追加" }).click();

  const pendingMessage = "「マトリックス」はすでに「視聴済み」にあります。ストックに戻しますか？";
  await expect(page.getByText(pendingMessage)).toBeVisible();
  await expect(page.getByRole("button", { name: "キャンセル" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ストックへ戻す" })).toBeVisible();

  await page.getByRole("button", { name: "キャンセル" }).click();

  await expect(page.getByText(pendingMessage)).toHaveCount(0);
  await expect(addDialog.getByRole("button", { name: "ストックに追加" })).toBeVisible();
});
