import "./edge-runtime.d.ts";
import { getSupabaseAdminClient } from "./supabase-admin.ts";

export type TwitchAccessToken = {
  accessToken: string;
  expiresAt: Date;
};

export type TwitchTokenStore = {
  read(): Promise<TwitchAccessToken | null>;
  upsertIfExpired(token: TwitchAccessToken): Promise<TwitchAccessToken | null>;
};

export type TwitchOauthClient = {
  fetchAccessToken(): Promise<TwitchAccessToken>;
};

export const TWITCH_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

export function isTwitchTokenValid(
  token: TwitchAccessToken,
  now: Date,
  bufferMs: number = TWITCH_TOKEN_REFRESH_BUFFER_MS,
): boolean {
  return token.expiresAt.getTime() - now.getTime() > bufferMs;
}

export function deriveTwitchExpiresAt(
  now: Date,
  expiresInSeconds: number,
  bufferMs: number = TWITCH_TOKEN_REFRESH_BUFFER_MS,
): Date {
  const expiresInMs = expiresInSeconds * 1000;
  return new Date(now.getTime() + Math.max(expiresInMs - bufferMs, 0));
}

export type EnsureValidAccessTokenOptions = {
  now?: Date;
  bufferMs?: number;
  force?: boolean;
};

export async function ensureValidTwitchAccessToken(
  store: TwitchTokenStore,
  oauth: TwitchOauthClient,
  options: EnsureValidAccessTokenOptions = {},
): Promise<string> {
  const now = options.now ?? new Date();
  const bufferMs = options.bufferMs ?? TWITCH_TOKEN_REFRESH_BUFFER_MS;

  if (!options.force) {
    const cached = await store.read();
    if (cached && isTwitchTokenValid(cached, now, bufferMs)) {
      return cached.accessToken;
    }
  }

  const fresh = await oauth.fetchAccessToken();
  const claimed = await store.upsertIfExpired(fresh);
  if (claimed) {
    return claimed.accessToken;
  }

  const latest = await store.read();
  if (!latest) {
    throw new Error("Twitch token store returned no row after refresh");
  }
  return latest.accessToken;
}

type TwitchOauthResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export function createTwitchOauthClient(options: {
  clientId: string;
  clientSecret: string;
  now?: () => Date;
  fetchImpl?: typeof fetch;
}): TwitchOauthClient {
  const now = options.now ?? (() => new Date());
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async fetchAccessToken() {
      const url = new URL("https://id.twitch.tv/oauth2/token");
      url.searchParams.set("client_id", options.clientId);
      url.searchParams.set("client_secret", options.clientSecret);
      url.searchParams.set("grant_type", "client_credentials");

      const response = await fetchImpl(url.toString(), { method: "POST" });
      if (!response.ok) {
        throw new Error(`Twitch token request failed with status ${response.status}`);
      }

      const json = (await response.json()) as TwitchOauthResponse;
      if (!json.access_token || typeof json.expires_in !== "number") {
        throw new Error("Twitch token response is malformed");
      }

      return {
        accessToken: json.access_token,
        expiresAt: deriveTwitchExpiresAt(now(), json.expires_in),
      };
    },
  };
}

type TwitchTokenRow = {
  access_token: string;
  expires_at: string;
};

const TWITCH_TOKEN_ROW_ID = 1;

export function createSupabaseTwitchTokenStore(): TwitchTokenStore {
  return {
    async read() {
      const admin = getRequiredAdminClient();
      const { data, error } = await admin
        .from("twitch_tokens")
        .select("access_token, expires_at")
        .eq("id", TWITCH_TOKEN_ROW_ID)
        .maybeSingle<TwitchTokenRow>();

      if (error) {
        throw new Error(`Failed to read twitch_tokens: ${error.message}`);
      }
      if (!data) {
        return null;
      }
      return {
        accessToken: data.access_token,
        expiresAt: new Date(data.expires_at),
      };
    },

    async upsertIfExpired(token) {
      const admin = getRequiredAdminClient();
      const expiresAtIso = token.expiresAt.toISOString();
      const nowIso = new Date().toISOString();

      const { data: updated, error: updateError } = await admin
        .from("twitch_tokens")
        .update({ access_token: token.accessToken, expires_at: expiresAtIso })
        .eq("id", TWITCH_TOKEN_ROW_ID)
        .lt("expires_at", nowIso)
        .select("access_token, expires_at");

      if (updateError) {
        throw new Error(`Failed to update twitch_tokens: ${updateError.message}`);
      }

      if (updated && updated.length > 0) {
        const row = updated[0] as TwitchTokenRow;
        return {
          accessToken: row.access_token,
          expiresAt: new Date(row.expires_at),
        };
      }

      const { error: insertError } = await admin.from("twitch_tokens").insert({
        id: TWITCH_TOKEN_ROW_ID,
        access_token: token.accessToken,
        expires_at: expiresAtIso,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          return null;
        }
        throw new Error(`Failed to insert twitch_tokens: ${insertError.message}`);
      }

      return token;
    },
  };
}

function getRequiredAdminClient() {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured");
  }
  return admin;
}

let cachedEnvOauthClient: TwitchOauthClient | null = null;

export function getDefaultTwitchOauthClient(): TwitchOauthClient {
  if (cachedEnvOauthClient) {
    return cachedEnvOauthClient;
  }

  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET");
  }

  cachedEnvOauthClient = createTwitchOauthClient({ clientId, clientSecret });
  return cachedEnvOauthClient;
}

export function resetDefaultTwitchOauthClientForTest() {
  cachedEnvOauthClient = null;
}
