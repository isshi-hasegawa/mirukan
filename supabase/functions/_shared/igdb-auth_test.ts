import { assertEquals, assertRejects } from "jsr:@std/assert";
import {
  deriveTwitchExpiresAt,
  ensureValidTwitchAccessToken,
  isTwitchTokenValid,
  type TwitchAccessToken,
  type TwitchOauthClient,
  type TwitchTokenStore,
} from "./igdb-auth.ts";

function createOauthClient(token: TwitchAccessToken): {
  oauth: TwitchOauthClient;
  callCount: () => number;
} {
  let calls = 0;
  return {
    oauth: {
      async fetchAccessToken() {
        calls += 1;
        return token;
      },
    },
    callCount: () => calls,
  };
}

Deno.test("isTwitchTokenValid はバッファ越えなら有効と判定する", () => {
  const now = new Date("2026-04-18T00:00:00Z");
  assertEquals(
    isTwitchTokenValid(
      { accessToken: "a", expiresAt: new Date("2026-04-18T00:02:00Z") },
      now,
      60 * 1000,
    ),
    true,
  );
  assertEquals(
    isTwitchTokenValid(
      { accessToken: "a", expiresAt: new Date("2026-04-18T00:00:30Z") },
      now,
      60 * 1000,
    ),
    false,
  );
});

Deno.test("deriveTwitchExpiresAt はバッファ分手前を expiresAt として返す", () => {
  const now = new Date("2026-04-18T00:00:00Z");
  const expiresAt = deriveTwitchExpiresAt(now, 3600, 60 * 1000);
  assertEquals(expiresAt.toISOString(), "2026-04-18T00:59:00.000Z");
});

Deno.test("deriveTwitchExpiresAt は expires_in がバッファ未満なら now と等価", () => {
  const now = new Date("2026-04-18T00:00:00Z");
  const expiresAt = deriveTwitchExpiresAt(now, 30, 60 * 1000);
  assertEquals(expiresAt.toISOString(), now.toISOString());
});

Deno.test("ensureValidTwitchAccessToken はキャッシュ有効時に Twitch を呼ばない", async () => {
  const cached: TwitchAccessToken = {
    accessToken: "cached",
    expiresAt: new Date("2026-04-18T01:00:00Z"),
  };
  const store: TwitchTokenStore = {
    read: async () => cached,
    upsertIfExpired: async () => {
      throw new Error("should not refresh");
    },
  };
  const { oauth, callCount } = createOauthClient({
    accessToken: "fresh",
    expiresAt: new Date("2026-04-18T02:00:00Z"),
  });

  const result = await ensureValidTwitchAccessToken(store, oauth, {
    now: new Date("2026-04-18T00:00:00Z"),
  });

  assertEquals(result, "cached");
  assertEquals(callCount(), 0);
});

Deno.test("ensureValidTwitchAccessToken は期限切れで refresh し勝者の token を返す", async () => {
  const stored: TwitchAccessToken = {
    accessToken: "old",
    expiresAt: new Date("2026-04-18T00:00:30Z"),
  };
  let writes = 0;
  const store: TwitchTokenStore = {
    read: async () => stored,
    upsertIfExpired: async (token) => {
      writes += 1;
      return token;
    },
  };
  const { oauth, callCount } = createOauthClient({
    accessToken: "fresh",
    expiresAt: new Date("2026-04-18T02:00:00Z"),
  });

  const result = await ensureValidTwitchAccessToken(store, oauth, {
    now: new Date("2026-04-18T00:01:00Z"),
  });

  assertEquals(result, "fresh");
  assertEquals(writes, 1);
  assertEquals(callCount(), 1);
});

Deno.test("ensureValidTwitchAccessToken は競合敗北時に DB の最新値を読み直す", async () => {
  let readCount = 0;
  const stored: TwitchAccessToken = {
    accessToken: "old",
    expiresAt: new Date("2026-04-18T00:00:30Z"),
  };
  const winnerToken: TwitchAccessToken = {
    accessToken: "winner",
    expiresAt: new Date("2026-04-18T03:00:00Z"),
  };
  const store: TwitchTokenStore = {
    read: async () => {
      readCount += 1;
      return readCount === 1 ? stored : winnerToken;
    },
    upsertIfExpired: async () => null,
  };
  const { oauth } = createOauthClient({
    accessToken: "loser",
    expiresAt: new Date("2026-04-18T02:00:00Z"),
  });

  const result = await ensureValidTwitchAccessToken(store, oauth, {
    now: new Date("2026-04-18T00:01:00Z"),
  });

  assertEquals(result, "winner");
  assertEquals(readCount, 2);
});

Deno.test("ensureValidTwitchAccessToken は force 指定で常に refresh する", async () => {
  const cached: TwitchAccessToken = {
    accessToken: "cached",
    expiresAt: new Date("2026-04-18T05:00:00Z"),
  };
  let writes = 0;
  const store: TwitchTokenStore = {
    read: async () => cached,
    upsertIfExpired: async (token) => {
      writes += 1;
      return token;
    },
  };
  const { oauth, callCount } = createOauthClient({
    accessToken: "fresh",
    expiresAt: new Date("2026-04-18T06:00:00Z"),
  });

  const result = await ensureValidTwitchAccessToken(store, oauth, {
    now: new Date("2026-04-18T00:00:00Z"),
    force: true,
  });

  assertEquals(result, "fresh");
  assertEquals(writes, 1);
  assertEquals(callCount(), 1);
});

Deno.test("ensureValidTwitchAccessToken は再読込でも row が無いと例外を投げる", async () => {
  const store: TwitchTokenStore = {
    read: async () => null,
    upsertIfExpired: async () => null,
  };
  const { oauth } = createOauthClient({
    accessToken: "fresh",
    expiresAt: new Date("2026-04-18T02:00:00Z"),
  });

  await assertRejects(
    () => ensureValidTwitchAccessToken(store, oauth),
    Error,
    "Twitch token store returned no row after refresh",
  );
});
