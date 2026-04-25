export const HOST = "127.0.0.1";
export const PORT = Number(process.env.MOCK_SUPABASE_PORT || "55432");
export const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "akari@example.com";
export const TEST_USER_SECRET = process.env.TEST_USER_SECRET || "ci-login-token";
export const TEST_USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
function encodeJwtSegment(value: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

// auth-js decodes the token before issuing authenticated requests in browser tests.
export function createMockAuthToken() {
  return [
    encodeJwtSegment({ alg: "HS256", typ: "JWT" }),
    encodeJwtSegment({
      sub: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      role: "authenticated",
      aud: "authenticated",
      exp: 4_102_444_800,
    }),
    encodeJwtSegment({ testOnly: true }),
  ].join(".");
}
export const REFRESH_TOKEN = "mock-refresh-token";
export const TOKEN_EXPIRES_IN = 60 * 60;
export const DEFAULT_RELEASE_DATE = "2025-02-02";
export const DEFAULT_WORK_TITLE = "テスト作品";
export const DEFAULT_WORK_ORIGINAL_TITLE = "Test Work";
export const DEFAULT_WORK_OVERVIEW = "overview";
export const DEFAULT_IMDB_ID = "tt7654321";

export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, accept-profile, content-profile",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "access-control-expose-headers": "content-range, x-supabase-api-version",
};
