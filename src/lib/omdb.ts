import { supabase } from "./supabase.ts";

export type OmdbWorkDetails = {
  rottenTomatoesScore: number | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  metacriticScore: number | null;
};

export async function fetchOmdbWorkDetails(imdbId: string): Promise<OmdbWorkDetails> {
  const { data, error } = await supabase.functions.invoke("fetch-omdb-work-details", {
    body: { imdbId },
  });

  if (error) {
    throw new Error(`Supabase function fetch-omdb-work-details failed: ${error.message}`);
  }

  return data as OmdbWorkDetails;
}
