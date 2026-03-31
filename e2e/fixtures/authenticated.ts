import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Fixture for authenticated tests
 * Provides a page with logged-in user state
 */

// Test environment variables (use real Supabase test credentials for E2E tests)
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@example.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "test-password-123";

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto("/");

    // Wait for login form to appear
    await page.waitForSelector("[type='email']", { timeout: 5000 });

    // Fill in credentials and submit (if not already logged in)
    const emailInput = await page.$("[type='email']");
    if (emailInput) {
      await page.fill("[type='email']", TEST_USER_EMAIL);
      await page.fill("[type='password']", TEST_USER_PASSWORD);
      await page.click("button[type='submit']");

      // Wait for navigation to board page
      await page.waitForURL("/", { timeout: 10000 });
    }

    // Provide authenticated page to test
    await use(page);
  },
});

export const { expect } = test;
