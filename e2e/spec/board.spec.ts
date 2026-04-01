import { test, expect } from "@playwright/test";

/**
 * Kanban Board E2E tests
 */

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "password123";

async function login(page: Parameters<typeof test>[0]["page"]) {
  await page.goto("/");
  await page.getByLabel("メールアドレス").fill(TEST_USER_EMAIL);
  await page.getByLabel("パスワード").fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: "ログインして backlog を見る" }).click();
  await expect(page.getByRole("heading", { name: "mirukan" })).toBeVisible();
}

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
  await expect(page.getByRole("heading", { name: "mirukan" })).toBeVisible();
});

test("作品追加の導線が表示される", async ({ page }) => {
  await login(page);

  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
});
