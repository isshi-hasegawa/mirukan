import { devices, type PlaywrightTestConfig } from "@playwright/test";

const baseUrl = "http://localhost:5173";

export function createSharedPlaywrightConfig(): Pick<
  PlaywrightTestConfig,
  | "testDir"
  | "testMatch"
  | "fullyParallel"
  | "forbidOnly"
  | "retries"
  | "workers"
  | "reporter"
  | "use"
  | "projects"
> {
  return {
    testDir: "./e2e",
    testMatch: "**/*.spec.ts",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: "html",
    use: {
      baseURL: baseUrl,
      storageState: "e2e/.auth/user.json",
      trace: "on-first-retry",
      screenshot: "only-on-failure",
      video: "retain-on-failure",
    },
    projects: [
      {
        name: "chromium",
        use: { ...devices["Desktop Chrome"] },
      },
      {
        name: "firefox",
        use: { ...devices["Desktop Firefox"] },
      },
      {
        name: "webkit",
        use: { ...devices["Desktop Safari"] },
      },
      {
        name: "Mobile Chrome",
        use: { ...devices["Pixel 5"] },
      },
    ],
  };
}

export function createPreviewCommand(supabaseUrl: string) {
  return `bash -lc 'VITE_SUPABASE_URL=${supabaseUrl} vp build && VITE_SUPABASE_URL=${supabaseUrl} vp preview --host 127.0.0.1 --port 5173'`;
}

export const playwrightBaseUrl = baseUrl;
