import { defineConfig, devices } from "@playwright/test";

const mockSupabasePort = process.env.MOCK_SUPABASE_PORT || "55432";
const mockSupabaseUrl = `http://127.0.0.1:${mockSupabasePort}`;
process.env.TEST_USER_SECRET ??= "ci-login-token";

/**
 * Playwright configuration for PR browser tests.
 *
 * PR では Supabase の mock backend を併用して高速な browser test を回す。
 * 本物の Supabase を使う統合確認は `playwright.integration.config.ts` 側で扱う。
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/global-setup-mock.ts",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Keep CI deterministic enough while avoiding fully serial E2E execution */
  workers: process.env.CI ? 2 : undefined,

  /* Reporter to use */
  reporter: "html",

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:5173",

    /* Reuse authenticated session for all tests by default */
    storageState: "e2e/.auth/user.json",

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
    // ローカルで `vp test:e2e -- --project firefox` のように個別実行する。
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

  webServer: [
    {
      command: `MOCK_SUPABASE_PORT=${mockSupabasePort} vp exec node --experimental-strip-types e2e/mock-supabase-server.ts`,
      url: `${mockSupabaseUrl}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `bash -lc 'VITE_SUPABASE_URL=${mockSupabaseUrl} vp build && VITE_SUPABASE_URL=${mockSupabaseUrl} vp preview --host 127.0.0.1 --port 5173'`,
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
