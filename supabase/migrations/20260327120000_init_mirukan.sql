create extension if not exists pgcrypto;

create type public.source_type as enum ('tmdb', 'manual');
create type public.tmdb_media_type as enum ('movie', 'tv');
create type public.work_type as enum ('movie', 'series', 'season');
create type public.duration_bucket as enum ('short', 'medium', 'long', 'very_long');
create type public.backlog_status as enum (
  'stacked',
  'want_to_watch',
  'watching',
  'interrupted',
  'watched'
);
create type public.primary_platform as enum (
  'netflix',
  'prime_video',
  'u_next',
  'disney_plus',
  'apple_tv_plus',
  'theater',
  'other'
);

create table public.works (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete restrict,
  source_type public.source_type not null,
  tmdb_media_type public.tmdb_media_type,
  tmdb_id bigint,
  work_type public.work_type not null,
  parent_work_id uuid references public.works (id) on delete restrict,
  title text not null,
  original_title text,
  search_text text not null default '',
  overview text,
  poster_path text,
  release_date date,
  runtime_minutes integer,
  typical_episode_runtime_minutes integer,
  duration_bucket public.duration_bucket,
  episode_count integer,
  season_count integer,
  season_number integer,
  genres text[] not null default '{}',
  focus_required_score smallint,
  background_fit_score smallint,
  completion_load_score smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint works_title_not_blank check (btrim(title) <> ''),
  constraint works_tmdb_fields_check check (
    (
      source_type = 'manual'
      and tmdb_media_type is null
      and tmdb_id is null
    )
    or (
      source_type = 'tmdb'
      and tmdb_media_type is not null
      and tmdb_id is not null
    )
  ),
  constraint works_tmdb_media_type_matches_work_type check (
    (
      work_type = 'movie'
      and (tmdb_media_type is null or tmdb_media_type = 'movie')
    )
    or (
      work_type in ('series', 'season')
      and (tmdb_media_type is null or tmdb_media_type = 'tv')
    )
  ),
  constraint works_season_shape_check check (
    (
      work_type = 'season'
      and parent_work_id is not null
      and season_number is not null
      and season_number > 0
      and season_count is null
      and runtime_minutes is null
    )
    or (
      work_type <> 'season'
      and parent_work_id is null
      and season_number is null
      and episode_count is null
    )
  ),
  constraint works_series_shape_check check (
    (
      work_type = 'series'
      and runtime_minutes is null
    )
    or work_type <> 'series'
  ),
  constraint works_movie_shape_check check (
    (
      work_type = 'movie'
      and typical_episode_runtime_minutes is null
      and episode_count is null
      and season_count is null
    )
    or work_type <> 'movie'
  ),
  constraint works_runtime_minutes_nonnegative check (
    runtime_minutes is null or runtime_minutes >= 0
  ),
  constraint works_typical_episode_runtime_minutes_nonnegative check (
    typical_episode_runtime_minutes is null or typical_episode_runtime_minutes >= 0
  ),
  constraint works_episode_count_nonnegative check (
    episode_count is null or episode_count >= 0
  ),
  constraint works_season_count_nonnegative check (
    season_count is null or season_count >= 0
  ),
  constraint works_focus_required_score_check check (
    focus_required_score is null or focus_required_score in (0, 25, 50, 75, 100)
  ),
  constraint works_background_fit_score_check check (
    background_fit_score is null or background_fit_score in (0, 25, 50, 75, 100)
  ),
  constraint works_completion_load_score_check check (
    completion_load_score is null or completion_load_score in (0, 25, 50, 75, 100)
  )
);

create unique index works_tmdb_movie_or_series_unique_idx
  on public.works (tmdb_media_type, tmdb_id)
  where source_type = 'tmdb' and work_type in ('movie', 'series');

create unique index works_tmdb_season_unique_idx
  on public.works (tmdb_media_type, tmdb_id, season_number)
  where source_type = 'tmdb' and work_type = 'season';

create index works_created_by_idx on public.works (created_by);
create index works_parent_work_id_idx on public.works (parent_work_id);
create index works_source_type_idx on public.works (source_type);
create index works_work_type_idx on public.works (work_type);
create index works_release_date_idx on public.works (release_date desc);

create table public.backlog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_id uuid not null references public.works (id) on delete restrict,
  status public.backlog_status not null,
  display_title text,
  primary_platform public.primary_platform,
  note text,
  sort_order numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_interacted_at timestamptz not null default now(),
  constraint backlog_items_display_title_not_blank check (
    display_title is null or btrim(display_title) <> ''
  )
);

create index backlog_items_user_status_sort_idx
  on public.backlog_items (user_id, status, sort_order, created_at);

create index backlog_items_user_last_interacted_idx
  on public.backlog_items (user_id, last_interacted_at desc);

create index backlog_items_work_id_idx on public.backlog_items (work_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_backlog_item_timestamps()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.last_interacted_at = now();
  return new;
end;
$$;

create trigger set_works_updated_at
before update on public.works
for each row
execute function public.set_updated_at();

create trigger set_backlog_items_timestamps
before update on public.backlog_items
for each row
execute function public.set_backlog_item_timestamps();

alter table public.works enable row level security;
alter table public.backlog_items enable row level security;

create policy "works are readable when shared or owned"
on public.works
for select
to authenticated
using (
  source_type = 'tmdb'
  or created_by = auth.uid()
);

create policy "authenticated users can insert works for themselves"
on public.works
for insert
to authenticated
with check (
  created_by = auth.uid()
);

create policy "owners can update their manual works"
on public.works
for update
to authenticated
using (
  source_type = 'manual'
  and created_by = auth.uid()
)
with check (
  source_type = 'manual'
  and created_by = auth.uid()
);

create policy "owners can delete their manual works"
on public.works
for delete
to authenticated
using (
  source_type = 'manual'
  and created_by = auth.uid()
);

create policy "users can read their own backlog items"
on public.backlog_items
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy "users can insert their own backlog items"
on public.backlog_items
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.works
    where works.id = backlog_items.work_id
      and (
        works.source_type = 'tmdb'
        or works.created_by = auth.uid()
      )
  )
);

create policy "users can update their own backlog items"
on public.backlog_items
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.works
    where works.id = backlog_items.work_id
      and (
        works.source_type = 'tmdb'
        or works.created_by = auth.uid()
      )
  )
);

create policy "users can delete their own backlog items"
on public.backlog_items
for delete
to authenticated
using (
  user_id = auth.uid()
);
