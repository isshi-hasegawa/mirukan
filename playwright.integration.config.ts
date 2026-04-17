import { defineConfig } from "@playwright/test";

import { createSharedPlaywrightConfig, playwrightBaseUrl } from "./e2e/playwright-shared.ts";

process.env.TEST_USER_SECRET ??= "password123";

export default defineConfig({
  ...createSharedPlaywrightConfig(),
  globalSetup: "./e2e/global-setup.ts",
  webServer: {
    command: "vp dev",
    url: playwrightBaseUrl,
    reuseExistingServer: !process.env.CI,
  },
});
