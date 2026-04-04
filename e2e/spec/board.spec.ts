import { test, expect } from "@playwright/test";
import { login } from "../support/app.ts";

/**
 * Kanban Board E2E tests
 */

test("ボードのコラムが表示される", async ({ page }) => {
  await login(page);

  const columnText = ["ストック", "見たい", "視聴中", "中断", "視聴済み"];
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
  await login(page);

  await expect(page.locator("main").or(page.locator("[role='main']")).first()).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
});

test("作品追加の導線が表示される", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
});
