type OmdbApiResponse = {
  Response: string;
  Error?: string;
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

function parseRottenTomatoesScore(value: string): number | null {
  const match = value.match(/^(\d+)%$/);
  if (!match) return null;
  const score = Number.parseInt(match[1], 10);
  return score >= 0 && score <= 100 ? score : null;
}

function parseImdbRating(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)\/10$/);
  if (!match) return null;
  const rating = Number.parseFloat(match[1]);
  return rating >= 0 && rating <= 10 ? rating : null;
}

function parseImdbVotes(value: string): number | null {
  const cleaned = value.replace(/,/g, "");
  const votes = Number.parseInt(cleaned, 10);
  return Number.isNaN(votes) ? null : votes;
}

function parseMetacriticScore(value: string): number | null {
  const match = value.match(/^(\d+)\/100$/);
  if (!match) return null;
  const score = Number.parseInt(match[1], 10);
  return score >= 0 && score <= 100 ? score : null;
}

export function isDefinitiveOmdbMiss(errorMessage: string): boolean {
  const normalized = errorMessage.trim().toLowerCase();
  return (
    normalized === "movie not found!" ||
    normalized === "series not found!" ||
    normalized === "episode not found!" ||
    normalized === "incorrect imdb id."
  );
}

export function extractRatings(json: OmdbApiResponse): OmdbWorkDetails {
  if (json.Response === "False") {
    if (json.Error && isDefinitiveOmdbMiss(json.Error)) {
      return {
        rottenTomatoesScore: null,
        imdbRating: null,
        imdbVotes: null,
        metacriticScore: null,
      };
    }
    throw new Error(json.Error ?? "OMDb returned an error response");
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

export async function fetchOmdbDetails(imdbId: string): Promise<OmdbWorkDetails> {
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
