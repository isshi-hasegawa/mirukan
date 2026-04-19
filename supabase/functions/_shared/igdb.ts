import "./edge-runtime.d.ts";
import {
  createSupabaseTwitchTokenStore,
  ensureValidTwitchAccessToken,
  getDefaultTwitchOauthClient,
} from "./igdb-auth.ts";

type GamePlatform = "steam" | "playstation" | "switch" | "xbox" | "ios" | "android";

type IgdbSearchResult = {
  igdbId: number;
  title: string;
  coverImageId: string | null;
  releaseDate: string | null;
  platforms: GamePlatform[];
};

type IgdbWorkDetails = {
  igdbId: number;
  title: string;
  summary: string | null;
  coverImageId: string | null;
  releaseDate: string | null;
  releaseDates: Partial<Record<GamePlatform, string>>;
  platforms: GamePlatform[];
  developer: string | null;
  publisher: string | null;
  franchise: string | null;
};

export type IgdbCallContext = {
  clientId: string;
  getAccessToken: (force: boolean) => Promise<string>;
  fetchImpl?: typeof fetch;
};

const IGDB_BASE_URL = "https://api.igdb.com/v4";

const IGDB_PLATFORM_SLUG_MAP: Record<string, GamePlatform> = {
  win: "steam",
  linux: "steam",
  mac: "steam",
  ps3: "playstation",
  ps4: "playstation",
  ps5: "playstation",
  psvita: "playstation",
  switch: "switch",
  "switch-2": "switch",
  xboxone: "xbox",
  "series-x-s": "xbox",
  "series-x": "xbox",
  xbox360: "xbox",
  ios: "ios",
  android: "android",
};

export function mapIgdbPlatformSlug(slug: string | null | undefined): GamePlatform | null {
  if (!slug) return null;
  return IGDB_PLATFORM_SLUG_MAP[slug] ?? null;
}

export function dedupePlatforms(values: Array<GamePlatform | null>): GamePlatform[] {
  const seen = new Set<GamePlatform>();
  const result: GamePlatform[] = [];
  for (const value of values) {
    if (value && !seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

export function unixSecondsToIsoDate(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return null;
  }
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

type IgdbSearchRow = {
  id: number;
  name?: string | null;
  cover?: { image_id?: string | null } | null;
  first_release_date?: number | null;
  platforms?: Array<{ slug?: string | null }> | null;
  alternative_names?: Array<{ name?: string | null; comment?: string | null }> | null;
};

type IgdbReleaseDateRow = {
  date?: number | null;
  platform?: { slug?: string | null } | null;
};

type IgdbInvolvedCompanyRow = {
  developer?: boolean | null;
  publisher?: boolean | null;
  company?: { name?: string | null } | null;
};

type IgdbDetailsRow = IgdbSearchRow & {
  release_dates?: IgdbReleaseDateRow[] | null;
  involved_companies?: IgdbInvolvedCompanyRow[] | null;
  franchises?: Array<{ name?: string | null }> | null;
  franchise?: { name?: string | null } | null;
};

const SEARCH_FIELDS = [
  "id",
  "name",
  "cover.image_id",
  "first_release_date",
  "platforms.slug",
  "alternative_names.name",
  "alternative_names.comment",
].join(",");

const DETAILS_FIELDS = [
  "id",
  "name",
  "summary",
  "cover.image_id",
  "first_release_date",
  "platforms.slug",
  "release_dates.date",
  "release_dates.platform.slug",
  "involved_companies.developer",
  "involved_companies.publisher",
  "involved_companies.company.name",
  "franchise.name",
  "franchises.name",
].join(",");

function escapeIgdbString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function hasJapaneseChars(text: string): boolean {
  return /[\u3040-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(text);
}

export function buildIgdbSearchBody(query: string, limit = 20): string {
  const escapedQuery = escapeIgdbString(query);
  if (hasJapaneseChars(query)) {
    return [
      `fields ${SEARCH_FIELDS};`,
      `where (name ~ *"${escapedQuery}"* | alternative_names.name ~ *"${escapedQuery}"*) & game_type = (0,8,9,10,11);`,
      `limit ${limit};`,
    ].join(" ");
  }
  return [
    `fields ${SEARCH_FIELDS};`,
    `search "${escapedQuery}";`,
    "where game_type = (0,8,9,10,11);",
    `limit ${limit};`,
  ].join(" ");
}

export function buildIgdbDetailsBody(igdbId: number): string {
  return [`fields ${DETAILS_FIELDS};`, `where id = ${igdbId};`, "limit 1;"].join(" ");
}

async function performIgdbCall(
  ctx: IgdbCallContext,
  endpoint: string,
  body: string,
): Promise<Response> {
  const fetchImpl = ctx.fetchImpl ?? fetch;
  let token = await ctx.getAccessToken(false);

  const buildRequest = (accessToken: string) =>
    fetchImpl(`${IGDB_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": ctx.clientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body,
    });

  let response = await buildRequest(token);

  if (response.status === 401) {
    token = await ctx.getAccessToken(true);
    response = await buildRequest(token);
  }

  return response;
}

export async function callIgdbEndpoint<T>(
  ctx: IgdbCallContext,
  endpoint: string,
  body: string,
): Promise<T> {
  const response = await performIgdbCall(ctx, endpoint, body);
  if (!response.ok) {
    throw new Error(`IGDB ${endpoint} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function selectJapaneseTitle(
  alternativeNames: Array<{ name?: string | null; comment?: string | null }> | null | undefined,
  fallback: string,
): string {
  const hasJapaneseChars = (text: string) => /[\u3040-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/.test(text);
  for (const alt of alternativeNames ?? []) {
    if (!alt.name) continue;
    if (hasJapaneseChars(alt.name) || /japan/i.test(alt.comment ?? "")) {
      return alt.name;
    }
  }
  return fallback;
}

function mapSearchRow(row: IgdbSearchRow): IgdbSearchResult | null {
  if (typeof row.id !== "number" || !row.name) {
    return null;
  }
  return {
    igdbId: row.id,
    title: selectJapaneseTitle(row.alternative_names, row.name),
    coverImageId: row.cover?.image_id ?? null,
    releaseDate: unixSecondsToIsoDate(row.first_release_date ?? null),
    platforms: dedupePlatforms((row.platforms ?? []).map((p) => mapIgdbPlatformSlug(p.slug))),
  };
}

export function selectInvolvedCompany(
  rows: IgdbInvolvedCompanyRow[] | null | undefined,
  role: "developer" | "publisher",
): string | null {
  for (const row of rows ?? []) {
    if (row[role] && row.company?.name) {
      return row.company.name;
    }
  }
  return null;
}

export function buildReleaseDatesByPlatform(
  rows: IgdbReleaseDateRow[] | null | undefined,
): Partial<Record<GamePlatform, string>> {
  const result: Partial<Record<GamePlatform, string>> = {};
  for (const row of rows ?? []) {
    const platform = mapIgdbPlatformSlug(row.platform?.slug);
    const iso = unixSecondsToIsoDate(row.date ?? null);
    if (!platform || !iso) {
      continue;
    }
    const existing = result[platform];
    if (!existing || iso < existing) {
      result[platform] = iso;
    }
  }
  return result;
}

function mapDetailsRow(row: IgdbDetailsRow): IgdbWorkDetails | null {
  if (typeof row.id !== "number" || !row.name) {
    return null;
  }
  const releaseDates = buildReleaseDatesByPlatform(row.release_dates);
  return {
    igdbId: row.id,
    title: row.name,
    summary: row.summary ?? null,
    coverImageId: row.cover?.image_id ?? null,
    releaseDate: unixSecondsToIsoDate(row.first_release_date ?? null),
    releaseDates,
    platforms: dedupePlatforms((row.platforms ?? []).map((p) => mapIgdbPlatformSlug(p.slug))),
    developer: selectInvolvedCompany(row.involved_companies, "developer"),
    publisher: selectInvolvedCompany(row.involved_companies, "publisher"),
    franchise: row.franchise?.name ?? row.franchises?.[0]?.name ?? null,
  };
}

export async function searchIgdbWorks(
  query: string,
  ctx: IgdbCallContext,
): Promise<IgdbSearchResult[]> {
  const body = buildIgdbSearchBody(query.trim());
  const rows = await callIgdbEndpoint<IgdbSearchRow[]>(ctx, "games", body);
  return rows.flatMap((row) => {
    const mapped = mapSearchRow(row);
    return mapped ? [mapped] : [];
  });
}

export async function fetchIgdbWorkDetails(
  igdbId: number,
  ctx: IgdbCallContext,
): Promise<IgdbWorkDetails> {
  const body = buildIgdbDetailsBody(igdbId);
  const rows = await callIgdbEndpoint<IgdbDetailsRow[]>(ctx, "games", body);
  const first = rows[0];
  const mapped = first ? mapDetailsRow(first) : null;
  if (!mapped) {
    throw new Error(`IGDB game ${igdbId} not found`);
  }
  return mapped;
}

export function getDefaultIgdbCallContext(): IgdbCallContext {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  if (!clientId) {
    throw new Error("Missing TWITCH_CLIENT_ID");
  }
  const store = createSupabaseTwitchTokenStore();
  const oauth = getDefaultTwitchOauthClient();
  return {
    clientId,
    getAccessToken: (force) =>
      ensureValidTwitchAccessToken(store, oauth, force ? { force: true } : undefined),
  };
}
