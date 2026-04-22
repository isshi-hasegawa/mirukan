function setEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY", value?: string) {
  const env = import.meta.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env[name];
    return;
  }

  env[name] = value;
}

async function importEnvModule() {
  vi.resetModules();
  return import("./env.ts");
}

describe("env", () => {
  const originalSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const originalSupabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    setEnv("VITE_SUPABASE_URL", originalSupabaseUrl);
    setEnv("VITE_SUPABASE_PUBLISHABLE_KEY", originalSupabasePublishableKey);
    vi.resetModules();
  });

  test("設定済みの環境変数をそのまま公開する", async () => {
    setEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    setEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

    const { env } = await importEnvModule();

    expect(env).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabasePublishableKey: "publishable-key",
    });
  });

  test("VITE_SUPABASE_URL が欠けていると import 時に失敗する", async () => {
    setEnv("VITE_SUPABASE_URL");
    setEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");

    await expect(importEnvModule()).rejects.toThrow(
      "Missing environment variable: VITE_SUPABASE_URL",
    );
  });

  test("VITE_SUPABASE_PUBLISHABLE_KEY が欠けていると import 時に失敗する", async () => {
    setEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    setEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

    await expect(importEnvModule()).rejects.toThrow(
      "Missing environment variable: VITE_SUPABASE_PUBLISHABLE_KEY",
    );
  });
});
