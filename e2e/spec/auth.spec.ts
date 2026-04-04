import { test, expect } from "@playwright/test";
import { login } from "../support/app.ts";

/**
 * Authentication flow E2E tests
 */

test("ログインページが表示される", async ({ page }) => {
  await page.goto("/");
  const submitButton = page.locator('form button[type="submit"]');

  // Check for login form elements
  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByLabel("パスワード")).toBeVisible();
  await expect(submitButton).toBeVisible();
});

test("メールアドレスとパスワードでログインできる", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toBeVisible();
});

test("ログイン前はボードが表示されない", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByLabel("メールアドレス")).toBeVisible();
  await expect(page.getByText("ストック")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "作品を検索してストックに追加" })).toHaveCount(0);
});
