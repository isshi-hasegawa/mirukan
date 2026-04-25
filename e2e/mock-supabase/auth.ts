import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createMockAuthToken,
  REFRESH_TOKEN,
  TEST_USER_EMAIL,
  TEST_USER_ID,
  TEST_USER_SECRET,
  TOKEN_EXPIRES_IN,
} from "./constants.ts";
import { json, noContent, readJson } from "./http.ts";
import type { SessionUser } from "./types.ts";

const sessionUser: SessionUser = {
  id: TEST_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: TEST_USER_EMAIL,
  email_confirmed_at: "2026-04-01T00:00:00.000Z",
  phone: "",
  confirmed_at: "2026-04-01T00:00:00.000Z",
  last_sign_in_at: "2026-04-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Akari" },
  identities: [],
  created_at: "2026-04-01T00:00:00.000Z",
  updated_at: "2026-04-01T00:00:00.000Z",
  is_anonymous: false,
};

function createSessionResponse() {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRES_IN;

  return {
    access_token: createMockAuthToken(),
    token_type: "bearer",
    expires_in: TOKEN_EXPIRES_IN,
    expires_at: expiresAt,
    refresh_token: REFRESH_TOKEN,
    user: sessionUser,
  };
}

export async function handleAuth(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (req.method === "POST" && url.pathname === "/auth/v1/token") {
    const body = (await readJson(req)) as { email?: string; password?: string } | null;
    if (body?.email !== TEST_USER_EMAIL || body?.password !== TEST_USER_SECRET) {
      json(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
      return true;
    }

    json(res, 200, createSessionResponse());
    return true;
  }

  if (req.method === "GET" && url.pathname === "/auth/v1/user") {
    json(res, 200, sessionUser);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/auth/v1/logout") {
    noContent(res);
    return true;
  }

  return false;
}
