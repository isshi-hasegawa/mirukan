create table public.tmdb_metadata_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index tmdb_metadata_cache_expires_idx
  on public.tmdb_metadata_cache (expires_at desc);

alter table public.tmdb_metadata_cache enable row level security;
