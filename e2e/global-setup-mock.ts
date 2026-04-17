import * as fs from "node:fs";
import * as path from "node:path";

const AUTH_FILE = path.resolve("e2e/.auth/user.json");

export default async function globalSetup() {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(
    AUTH_FILE,
    JSON.stringify(
      {
        cookies: [],
        origins: [
          {
            origin: "http://localhost:5173",
            localStorage: [
              {
                name: "sb-127-auth-token",
                value: JSON.stringify({
                  access_token: "mock-access-token",
                  token_type: "bearer",
                  expires_in: 3600,
                  expires_at: expiresAt,
                  refresh_token: "mock-refresh-token",
                  user: {
                    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
                    aud: "authenticated",
                    role: "authenticated",
                    email: "akari@example.com",
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
                  },
                }),
              },
            ],
          },
        ],
      },
      null,
      2,
    ),
  );
}
