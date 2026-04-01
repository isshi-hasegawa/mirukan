import { test, expect } from "@playwright/test";

/**
 * Authentication flow E2E tests
 */

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "password123";

test("ログインページが表示される", async ({ page }) => {
  await page.goto("/");

  // Check for login form elements
  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード")).toBeVisible();
  await expect(page.getByRole("button", { name: "ログインして backlog を見る" })).toBeVisible();
});

test("メールアドレスとパスワードでログインできる", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("メールアドレス").fill(TEST_USER_EMAIL);
  await page.getByLabel("パスワード").fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: "ログインして backlog を見る" }).click();

  await expect(page.getByRole("heading", { name: "mirukan" })).toBeVisible();
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
});

test("ログイン前はボードが表示されない", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByRole("heading", { name: "mirukan" })).not.toBeVisible();
  await expect(page.getByText("ストック")).not.toBeVisible();
});
