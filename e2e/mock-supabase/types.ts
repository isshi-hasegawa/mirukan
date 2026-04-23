import type { IncomingMessage, ServerResponse } from "node:http";

export type Work = {
  id: string;
  created_by: string;
  source_type: "tmdb" | "manual";
  tmdb_media_type: "movie" | "tv" | null;
  tmdb_id: number | null;
  work_type: "movie" | "series" | "season";
  parent_work_id: string | null;
  title: string;
  original_title: string | null;
  search_text: string;
  overview: string | null;
  poster_path: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  typical_episode_runtime_minutes: number | null;
  duration_bucket: "short" | "medium" | "long" | "very_long" | null;
  episode_count: number | null;
  season_count: number | null;
  season_number: number | null;
  genres: string[];
  focus_required_score: number | null;
  background_fit_score: number | null;
  completion_load_score: number | null;
  imdb_id: string | null;
  omdb_fetched_at: string | null;
  rotten_tomatoes_score: number | null;
  imdb_rating: number | null;
  imdb_votes: number | null;
  metacritic_score: number | null;
  last_tmdb_synced_at: string | null;
  series_title: string | null;
};

export type BacklogItem = {
  id: string;
  user_id: string;
  work_id: string;
  status: "stacked" | "want_to_watch" | "watching" | "interrupted" | "watched";
  primary_platform:
    | "netflix"
    | "prime_video"
    | "u_next"
    | "disney_plus"
    | "hulu"
    | "apple_tv_plus"
    | "apple_tv"
    | null;
  note: string | null;
  sort_order: number;
  display_title: string | null;
  created_at: string;
};

export type SessionUser = {
  id: string;
  aud: "authenticated";
  role: "authenticated";
  email: string;
  email_confirmed_at: string;
  phone: string;
  confirmed_at: string;
  last_sign_in_at: string;
  app_metadata: { provider: "email"; providers: ["email"] };
  user_metadata: { name: string };
  identities: [];
  created_at: string;
  updated_at: string;
  is_anonymous: false;
};

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
) => Promise<boolean> | boolean;
