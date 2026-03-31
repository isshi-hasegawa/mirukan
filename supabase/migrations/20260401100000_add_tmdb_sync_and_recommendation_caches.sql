alter table public.works
add column if not exists last_tmdb_synced_at timestamptz;

update public.works
set last_tmdb_synced_at = coalesce(last_tmdb_synced_at, updated_at, created_at, now())
where source_type = 'tmdb'
  and last_tmdb_synced_at is null;

drop policy if exists "owners can update their own works" on public.works;

create policy "authenticated users can update tmdb works and owners can update manual works"
on public.works
for update
to authenticated
using (
  source_type = 'tmdb'
  or created_by = auth.uid()
)
with check (
  source_type = 'tmdb'
  or created_by = auth.uid()
);

create table public.tmdb_trending_cache (
  cache_window text not null,
  rank integer not null,
  tmdb_media_type public.tmdb_media_type not null,
  tmdb_id bigint not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (cache_window, tmdb_media_type, tmdb_id)
);

create index tmdb_trending_cache_window_rank_idx
  on public.tmdb_trending_cache (cache_window, rank);

create index tmdb_trending_cache_window_expires_idx
  on public.tmdb_trending_cache (cache_window, expires_at desc);

create table public.work_recommendation_cache (
  recommendation_source text not null,
  source_tmdb_media_type public.tmdb_media_type not null,
  source_tmdb_id bigint not null,
  recommended_tmdb_media_type public.tmdb_media_type not null,
  recommended_tmdb_id bigint not null,
  rank integer not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (
    recommendation_source,
    source_tmdb_media_type,
    source_tmdb_id,
    recommended_tmdb_media_type,
    recommended_tmdb_id
  )
);

create index work_recommendation_cache_source_rank_idx
  on public.work_recommendation_cache (
    recommendation_source,
    source_tmdb_media_type,
    source_tmdb_id,
    rank
  );

create index work_recommendation_cache_source_expires_idx
  on public.work_recommendation_cache (
    recommendation_source,
    source_tmdb_media_type,
    source_tmdb_id,
    expires_at desc
  );

alter table public.tmdb_trending_cache enable row level security;
alter table public.work_recommendation_cache enable row level security;
