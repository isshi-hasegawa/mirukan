alter table public.works
  add column imdb_id text,
  add column rotten_tomatoes_score smallint,
  add column imdb_rating numeric(3, 1),
  add column imdb_votes integer,
  add column metacritic_score smallint,
  add column omdb_fetched_at timestamptz;

alter table public.works
  add constraint works_rotten_tomatoes_score_range check (
    rotten_tomatoes_score is null
    or (rotten_tomatoes_score >= 0 and rotten_tomatoes_score <= 100)
  ),
  add constraint works_imdb_rating_range check (
    imdb_rating is null
    or (imdb_rating >= 0 and imdb_rating <= 10)
  ),
  add constraint works_metacritic_score_range check (
    metacritic_score is null
    or (metacritic_score >= 0 and metacritic_score <= 100)
  );
