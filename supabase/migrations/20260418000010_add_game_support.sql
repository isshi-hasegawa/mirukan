create type public.game_platform as enum (
  'steam',
  'playstation',
  'switch',
  'xbox',
  'ios',
  'android'
);

alter table public.works
  add column igdb_id bigint,
  add column release_dates jsonb,
  add column developer text,
  add column publisher text,
  add column franchise text;

alter table public.works
  drop constraint works_tmdb_fields_check;

alter table public.works
  add constraint works_source_fields_check check (
    (
      source_type = 'manual'
      and tmdb_media_type is null
      and tmdb_id is null
      and igdb_id is null
    )
    or (
      source_type = 'tmdb'
      and tmdb_media_type is not null
      and tmdb_id is not null
      and igdb_id is null
    )
    or (
      source_type = 'igdb'
      and tmdb_media_type is null
      and tmdb_id is null
      and igdb_id is not null
    )
  );

alter table public.works
  drop constraint works_tmdb_media_type_matches_work_type;

alter table public.works
  add constraint works_tmdb_media_type_matches_work_type check (
    (
      work_type = 'movie'
      and (tmdb_media_type is null or tmdb_media_type = 'movie')
    )
    or (
      work_type in ('series', 'season')
      and (tmdb_media_type is null or tmdb_media_type = 'tv')
    )
    or (
      work_type = 'game'
      and tmdb_media_type is null
    )
  );

create unique index works_igdb_game_unique_idx
  on public.works (igdb_id)
  where source_type = 'igdb';

drop index if exists public.works_manual_title_unique_idx;

create unique index works_manual_title_unique_idx
  on public.works (created_by, work_type, search_text)
  where source_type = 'manual' and work_type in ('movie', 'series', 'game');

drop policy if exists "works are readable when shared or owned" on public.works;

create policy "works are readable when shared or owned"
on public.works
for select
to authenticated
using (
  source_type in ('tmdb', 'igdb')
  or created_by = auth.uid()
);

create table public.twitch_tokens (
  id smallint primary key default 1,
  access_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint twitch_tokens_singleton check (id = 1)
);

alter table public.twitch_tokens enable row level security;

create trigger set_twitch_tokens_updated_at
before update on public.twitch_tokens
for each row
execute function public.set_updated_at();
