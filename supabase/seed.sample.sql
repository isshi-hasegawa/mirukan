-- Optional sample data for local demos.
-- Apply after `supabase db reset` with:
--   supabase db query --file supabase/seed.sample.sql

do $$
declare
  user_akari constant uuid := '11111111-1111-1111-1111-111111111111';
  sample_status constant public.backlog_status := 'stacked';
begin
  with work_rows (
    id,
    created_by,
    source_type,
    tmdb_media_type,
    tmdb_id,
    work_type,
    parent_work_id,
    title,
    original_title,
    search_text,
    overview,
    poster_path,
    release_date,
    runtime_minutes,
    typical_episode_runtime_minutes,
    duration_bucket,
    episode_count,
    season_count,
    season_number,
    genres,
    focus_required_score,
    background_fit_score,
    completion_load_score,
    created_at,
    updated_at
  ) as (
    values
      (
        'cccccccc-cccc-cccc-cccc-ccccccccccc1'::uuid,
        user_akari,
        'tmdb'::public.source_type,
        'movie'::public.tmdb_media_type,
        1366::bigint,
        'movie'::public.work_type,
        null::uuid,
        'ロッキー',
        'Rocky',
        'ロッキー rocky ドラマ',
        '努力して前に進みたい日に置いておく定番。',
        '/y4dh1zqKfydmPY7VmjZ0c7IbXO4.jpg',
        '1976-12-03'::date,
        119,
        null::integer,
        'long'::public.duration_bucket,
        null::integer,
        null::integer,
        null::integer,
        array['Drama']::text[],
        50::smallint,
        25::smallint,
        50::smallint,
        now() - interval '14 days',
        now() - interval '14 days'
      ),
      (
        'cccccccc-cccc-cccc-cccc-ccccccccccc2'::uuid,
        user_akari,
        'tmdb'::public.source_type,
        'tv'::public.tmdb_media_type,
        2304::bigint,
        'series'::public.work_type,
        null::uuid,
        'きかんしゃトーマス',
        'Thomas & Friends',
        'きかんしゃトーマス thomas & friends アニメーション kids',
        '気軽に流せるシリーズの見本データ。',
        '/wrFb5dE2yxUjz3a5V7PEXPPzsFU.jpg',
        '1984-10-09'::date,
        null::integer,
        22,
        'short'::public.duration_bucket,
        24,
        24,
        null::integer,
        array['Animation', 'Kids']::text[],
        25::smallint,
        75::smallint,
        100::smallint,
        now() - interval '13 days',
        now() - interval '13 days'
      ),
      (
        'cccccccc-cccc-cccc-cccc-ccccccccccc3'::uuid,
        user_akari,
        'tmdb'::public.source_type,
        'movie'::public.tmdb_media_type,
        24428::bigint,
        'movie'::public.work_type,
        null::uuid,
        'アベンジャーズ',
        'The Avengers',
        'アベンジャーズ avengers',
        '人が多い盤面や並び替え確認に使う追加カード。',
        '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
        '2012-04-25'::date,
        143,
        null::integer,
        'very_long'::public.duration_bucket,
        null::integer,
        null::integer,
        null::integer,
        array['Action', 'Science Fiction']::text[],
        75::smallint,
        25::smallint,
        75::smallint,
        now() - interval '12 days',
        now() - interval '12 days'
      )
  )
  insert into public.works (
    id,
    created_by,
    source_type,
    tmdb_media_type,
    tmdb_id,
    work_type,
    parent_work_id,
    title,
    original_title,
    search_text,
    overview,
    poster_path,
    release_date,
    runtime_minutes,
    typical_episode_runtime_minutes,
    duration_bucket,
    episode_count,
    season_count,
    season_number,
    genres,
    focus_required_score,
    background_fit_score,
    completion_load_score,
    created_at,
    updated_at
  )
  select * from work_rows
  on conflict (id) do update
  set
    created_by = excluded.created_by,
    source_type = excluded.source_type,
    tmdb_media_type = excluded.tmdb_media_type,
    tmdb_id = excluded.tmdb_id,
    work_type = excluded.work_type,
    parent_work_id = excluded.parent_work_id,
    title = excluded.title,
    original_title = excluded.original_title,
    search_text = excluded.search_text,
    overview = excluded.overview,
    poster_path = excluded.poster_path,
    release_date = excluded.release_date,
    runtime_minutes = excluded.runtime_minutes,
    typical_episode_runtime_minutes = excluded.typical_episode_runtime_minutes,
    duration_bucket = excluded.duration_bucket,
    episode_count = excluded.episode_count,
    season_count = excluded.season_count,
    season_number = excluded.season_number,
    genres = excluded.genres,
    focus_required_score = excluded.focus_required_score,
    background_fit_score = excluded.background_fit_score,
    completion_load_score = excluded.completion_load_score,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  with backlog_rows (
    id,
    user_id,
    work_id,
    status,
    primary_platform,
    note,
    sort_order,
    created_at,
    updated_at,
    last_interacted_at
  ) as (
    values
      (
        'dddddddd-dddd-dddd-dddd-ddddddddddd1'::uuid,
        user_akari,
        'cccccccc-cccc-cccc-cccc-ccccccccccc1'::uuid,
        sample_status,
        'u_next'::public.primary_platform,
        '追加サンプル 1。',
        2000::numeric,
        now() - interval '14 days',
        now() - interval '14 days',
        now() - interval '14 days'
      ),
      (
        'dddddddd-dddd-dddd-dddd-ddddddddddd2'::uuid,
        user_akari,
        'cccccccc-cccc-cccc-cccc-ccccccccccc2'::uuid,
        sample_status,
        null::public.primary_platform,
        '追加サンプル 2。',
        3000::numeric,
        now() - interval '13 days',
        now() - interval '13 days',
        now() - interval '13 days'
      ),
      (
        'dddddddd-dddd-dddd-dddd-ddddddddddd3'::uuid,
        user_akari,
        'cccccccc-cccc-cccc-cccc-ccccccccccc3'::uuid,
        sample_status,
        'disney_plus'::public.primary_platform,
        '追加サンプル 3。',
        4000::numeric,
        now() - interval '12 days',
        now() - interval '12 days',
        now() - interval '12 days'
      )
  )
  insert into public.backlog_items (
    id,
    user_id,
    work_id,
    status,
    primary_platform,
    note,
    sort_order,
    created_at,
    updated_at,
    last_interacted_at
  )
  select * from backlog_rows
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    work_id = excluded.work_id,
    status = excluded.status,
    primary_platform = excluded.primary_platform,
    note = excluded.note,
    sort_order = excluded.sort_order,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    last_interacted_at = excluded.last_interacted_at;
end
$$;
