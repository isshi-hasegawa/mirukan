import "../_shared/edge-runtime.d.ts";
import {
  badRequestResponse,
  handleCorsPreflightRequest,
  internalServerErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  readJsonBody,
} from "../_shared/http.ts";

type FetchOmdbWorkDetailsRequest = {
  imdbId?: string;
};

type OmdbApiResponse = {
  Response: string;
  Ratings?: Array<{
    Source: string;
    Value: string;
  }>;
  imdbVotes?: string;
};

export type OmdbWorkDetails = {
  rottenTomatoesScore: number | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  metacriticScore: number | null;
};

function getOmdbApiKey(): string {
  const apiKey = Deno.env.get("OMDB_API_KEY");
  if (!apiKey) {
    throw new Error("Missing environment variable: OMDB_API_KEY");
  }
  return apiKey;
}

export function parseRottenTomatoesScore(value: string): number | null {
  const match = value.match(/^(\d+)%$/);
  if (!match) return null;
  const score = Number.parseInt(match[1], 10);
  return score >= 0 && score <= 100 ? score : null;
}

export function parseImdbRating(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)\/10$/);
  if (!match) return null;
  const rating = Number.parseFloat(match[1]);
  return rating >= 0 && rating <= 10 ? rating : null;
}

export function parseImdbVotes(value: string): number | null {
  const cleaned = value.replace(/,/g, "");
  const votes = Number.parseInt(cleaned, 10);
  return Number.isNaN(votes) ? null : votes;
}

export function parseMetacriticScore(value: string): number | null {
  const match = value.match(/^(\d+)\/100$/);
  if (!match) return null;
  const score = Number.parseInt(match[1], 10);
  return score >= 0 && score <= 100 ? score : null;
}

export function extractRatings(json: OmdbApiResponse): OmdbWorkDetails {
  if (json.Response === "False") {
    return { rottenTomatoesScore: null, imdbRating: null, imdbVotes: null, metacriticScore: null };
  }

  let rottenTomatoesScore: number | null = null;
  let imdbRating: number | null = null;
  let imdbVotes: number | null = null;
  let metacriticScore: number | null = null;

  for (const rating of json.Ratings ?? []) {
    if (rating.Source === "Rotten Tomatoes") {
      rottenTomatoesScore = parseRottenTomatoesScore(rating.Value);
    } else if (rating.Source === "Internet Movie Database") {
      imdbRating = parseImdbRating(rating.Value);
    } else if (rating.Source === "Metacritic") {
      metacriticScore = parseMetacriticScore(rating.Value);
    }
  }

  if (json.imdbVotes && imdbRating !== null) {
    imdbVotes = parseImdbVotes(json.imdbVotes);
  }

  return { rottenTomatoesScore, imdbRating, imdbVotes, metacriticScore };
}

async function fetchOmdbDetails(imdbId: string): Promise<OmdbWorkDetails> {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("i", imdbId);
  url.searchParams.set("apikey", getOmdbApiKey());

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OMDb request failed with status ${response.status}`);
  }

  const json = (await response.json()) as OmdbApiResponse;
  return extractRatings(json);
}

Deno.serve(async (request) => {
  const corsResponse = handleCorsPreflightRequest(request);
  if (corsResponse) {
    return corsResponse;
  }

  if (request.method !== "POST") {
    return methodNotAllowedResponse();
  }

  try {
    const body = await readJsonBody<FetchOmdbWorkDetailsRequest>(request);

    if (!body.imdbId) {
      return badRequestResponse("imdbId is required");
    }

    return jsonResponse(await fetchOmdbDetails(body.imdbId));
  } catch (error) {
    return internalServerErrorResponse(error);
  }
});
