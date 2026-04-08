import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 *
 * Project ライン:
 *   必須ライン（CI で常時実行）: chromium
 *   任意ライン（手動 QA・必要時の追加確認）: firefox, webkit, Mobile Chrome
 *
 * CI では `--project chromium` のみを実行する。
 * firefox / webkit / Mobile Chrome は `pnpm test:e2e` でローカル確認するか、
 * 必要なときに `pnpm test:e2e --project firefox` のように個別に実行する。
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: "html",

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:5173",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",
  },

  projects: [
    // ── 必須ライン（CI で常時実行） ──────────────────────────────────────
    // 更新系フロー（追加・編集・列移動・削除）は chromium のみで担保する。
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // ── 任意ライン（手動 QA・必要時の追加確認） ──────────────────────────
    // 通常の CI チェックには含めない。
    // ローカルで `pnpm test:e2e --project firefox` のように個別実行する。
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // モバイル回帰は Mobile Chrome 1 本に絞る。
    // 確認内容はタブ切り替えや導線確認など閲覧系に限定する。
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "vp dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
