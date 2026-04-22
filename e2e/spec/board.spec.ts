import { test, expect } from "@playwright/test";

/**
 * Kanban Board E2E tests
 */

test("ボードのコラムが表示される", async ({ page }) => {
  await page.goto("/");

  const columnText = ["ストック", "次に見る", "視聴中", "保留", "鑑賞済み"];
  const isMobileLayout = page.viewportSize()?.width !== null && page.viewportSize()!.width <= 720;

  for (const text of columnText) {
    if (isMobileLayout) {
      await expect(page.getByRole("tab", { name: text })).toBeVisible();
      continue;
    }

    await expect(page.getByRole("heading", { name: text })).toBeVisible();
  }
});

test("ボードが読み込まれる", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("main").or(page.locator("[role='main']")).first()).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
});

test("作品追加の導線が表示される", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
});
