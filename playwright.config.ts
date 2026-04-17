import { defineConfig } from "@playwright/test";

import {
  createPreviewCommand,
  createSharedPlaywrightConfig,
  playwrightBaseUrl,
} from "./e2e/playwright-shared.ts";

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
  ...createSharedPlaywrightConfig(),
  globalSetup: "./e2e/global-setup-mock.ts",

  webServer: [
    {
      command: `MOCK_SUPABASE_PORT=${mockSupabasePort} vp exec node --experimental-strip-types e2e/mock-supabase-server.ts`,
      url: `${mockSupabaseUrl}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: createPreviewCommand(mockSupabaseUrl),
      url: playwrightBaseUrl,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
