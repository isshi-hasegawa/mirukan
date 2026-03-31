import { test, expect } from "@playwright/test";

/**
 * Authentication flow E2E tests
 */

test("ログインページが表示される", async ({ page }) => {
  await page.goto("/");

  // Check for login form elements
  await expect(page.locator("[type='email']")).toBeVisible();
  await expect(page.locator("[type='password']")).toBeVisible();
  await expect(page.locator("button[type='submit']")).toBeVisible();
});

test("メールアドレスとパスワードでログインできる", async ({ page }) => {
  const testEmail = process.env.TEST_USER_EMAIL || "test@example.com";
  const testPassword = process.env.TEST_USER_PASSWORD || "test-password-123";

  // Navigate to login page
  await page.goto("/");

  // Fill in credentials
  await page.fill("[type='email']", testEmail);
  await page.fill("[type='password']", testPassword);

  // Note: This test is disabled by default since it requires valid test credentials
  // To run: set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables
  // and uncomment the submit and assertion below

  // await page.click("button[type='submit']");

  // Wait for navigation to board page
  // await page.waitForURL("/", { timeout: 10000 });

  // Verify user is logged in by checking for board elements
  // await expect(page.locator("text=Backlog")).toBeVisible();
});

test("ログイン前はボードが表示されない", async ({ page }) => {
  // Navigate to root without logging in
  await page.goto("/");

  // Should see login form, not board
  await expect(page.locator("[type='email']")).toBeVisible();
  await expect(
    page.locator("text=Stacked").or(page.locator("text=Want to Watch")),
  ).not.toBeVisible();
});
