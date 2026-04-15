-- Minimal local seed used by `supabase db reset`.
-- Keeps login/E2E prerequisites plus one card per primary backlog status.

do $$
declare
  auth_instance_id constant uuid := '00000000-0000-0000-0000-000000000000';
  auth_role constant text := 'authenticated';
  email_provider constant text := 'email';
  empty_text constant text := '';
  user_akari constant uuid := '11111111-1111-1111-1111-111111111111';
  user_akari_email constant text := 'akari@example.com';
  user_ren constant uuid := '22222222-2222-2222-2222-222222222222';
  user_ren_email constant text := 'ren@example.com';
  work_manual_movie constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  work_tmdb_movie constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  work_tmdb_series constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  work_tmdb_season2 constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
  work_manual_series constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5';
  work_tmdb_interrupted constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6';
  tmdb_media_type_movie constant public.tmdb_media_type := 'movie';
  work_type_movie constant public.work_type := 'movie';
  default_sort_order constant integer := 1000;
  two_days_ago constant interval := interval '2 days';
  platform_netflix constant public.primary_platform := 'netflix';
  manual_movie_title constant text := 'あの日の街角';
  genre_drama constant text := 'Drama';
  genres_drama_crime constant text[] := array[genre_drama, 'Crime'];
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone,
    phone_change,
    phone_change_token,
    reauthentication_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  )
  values
    (
      auth_instance_id,
      user_akari,
      auth_role,
      auth_role,
      user_akari_email,
      crypt('password123', gen_salt('bf')),
      now(),
      empty_text,
      empty_text,
      empty_text,
      empty_text,
      empty_text,
      null,
      empty_text,
      empty_text,
      empty_text,
      '{"provider":"email","providers":["email"]}',
      '{"name":"Akari"}',
      now(),
      now(),
      false,
      false
    ),
    (
      auth_instance_id,
      user_ren,
      auth_role,
      auth_role,
      user_ren_email,
      crypt('password123', gen_salt('bf')),
      now(),
      empty_text,
      empty_text,
      empty_text,
      empty_text,
      empty_text,
      null,
      empty_text,
      empty_text,
      empty_text,
      '{"provider":"email","providers":["email"]}',
      '{"name":"Ren"}',
      now(),
      now(),
      false,
      false
    )
  on conflict (id) do update
  set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = excluded.email_confirmed_at,
    confirmation_token = excluded.confirmation_token,
    recovery_token = excluded.recovery_token,
    email_change = excluded.email_change,
    email_change_token_new = excluded.email_change_token_new,
    email_change_token_current = excluded.email_change_token_current,
    phone = excluded.phone,
    phone_change = excluded.phone_change,
    phone_change_token = excluded.phone_change_token,
    reauthentication_token = excluded.reauthentication_token,
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values
    (
      '33333333-3333-3333-3333-333333333331',
      user_akari,
      format('{"sub":"%s","email":"%s"}', user_akari, user_akari_email)::jsonb,
      email_provider,
      user_akari_email,
      now(),
      now(),
      now()
    ),
    (
      '33333333-3333-3333-3333-333333333332',
      user_ren,
      format('{"sub":"%s","email":"%s"}', user_ren, user_ren_email)::jsonb,
      email_provider,
      user_ren_email,
      now(),
      now(),
      now()
    )
  on conflict (provider_id, provider) do update
  set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = excluded.updated_at;

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
    completion_load_score
  )
  values
    (
      work_manual_movie,
      user_akari,
      'manual',
      null,
      null,
      work_type_movie,
      null,
      manual_movie_title,
      null,
      manual_movie_title,
      '配信では見つからなかったので手動で積んだ、しっとり系のヒューマンドラマ。',
      null,
      '2018-04-13',
      95,
      null,
      'long',
      null,
      null,
      null,
      array[genre_drama, 'Family'],
      50,
      25,
      25
    ),
    (
      work_tmdb_movie,
      user_akari,
      'tmdb',
      tmdb_media_type_movie,
      603,
      work_type_movie,
      null,
      'マトリックス',
      'The Matrix',
      'マトリックス the matrix',
      'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
      '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
      '1999-03-31',
      136,
      null,
      'very_long',
      null,
      null,
      null,
      array['Action', 'Science Fiction'],
      75,
      25,
      50
    ),
    (
      work_tmdb_series,
      user_akari,
      'tmdb',
      'tv',
      1396,
      'series',
      null,
      'ブレイキング・バッド',
      'Breaking Bad',
      'ブレイキング・バッド breaking bad',
      'A high school chemistry teacher turned meth producer navigates danger, pride, and family collapse.',
      '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
      '2008-01-20',
      null,
      47,
      'medium',
      7,
      5,
      null,
      genres_drama_crime,
      75,
      0,
      100
    ),
    (
      work_tmdb_season2,
      user_akari,
      'tmdb',
      'tv',
      1396,
      'season',
      work_tmdb_series,
      'ブレイキング・バッド シーズン2',
      'Breaking Bad Season 2',
      'ブレイキング・バッド season 2',
      'ウォルターとジェシーの選択がさらに重くなっていく第二シーズン。',
      '/eSzpy96DwBujGFj0xMbXBcGcfxX.jpg',
      '2009-03-08',
      null,
      47,
      'medium',
      13,
      null,
      2,
      genres_drama_crime,
      75,
      0,
      100
    ),
    (
      work_manual_series,
      user_akari,
      'manual',
      null,
      null,
      'series',
      null,
      '週末メモリーズ',
      null,
      '週末メモリーズ',
      'あとで配信先を調べたい、雑談向きの軽めシリーズ。',
      null,
      '2021-10-08',
      null,
      24,
      'short',
      10,
      1,
      null,
      array['Comedy'],
      25,
      75,
      25
    ),
    (
      work_tmdb_interrupted,
      user_akari,
      'tmdb',
      tmdb_media_type_movie,
      157336,
      work_type_movie,
      null,
      'インターステラー',
      'Interstellar',
      'インターステラー interstellar',
      'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.',
      '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      '2014-11-05',
      169,
      null,
      'very_long',
      null,
      null,
      null,
      array['Adventure', genre_drama, 'Science Fiction'],
      100,
      0,
      100
    )
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
    completion_load_score = excluded.completion_load_score;

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
  values
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
      user_akari,
      work_manual_movie,
      'stacked',
      null,
      '配信先不明。週末に腰を据えて観たい。',
      default_sort_order,
      now() - interval '5 days',
      now() - two_days_ago,
      now() - two_days_ago
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      user_akari,
      work_manual_series,
      'want_to_watch',
      null,
      '軽い気分の日に候補へ回しておく。',
      default_sort_order,
      now() - interval '4 days',
      now() - interval '1 day',
      now() - interval '1 day'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      user_akari,
      work_tmdb_series,
      'watching',
      platform_netflix,
      '今月の平日夜に少しずつ進める。',
      default_sort_order,
      now() - interval '10 days',
      now() - interval '12 hours',
      now() - interval '12 hours'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
      user_akari,
      work_tmdb_season2,
      'interrupted',
      platform_netflix,
      '再開ポイント確認待ち。',
      default_sort_order,
      now() - interval '14 days',
      now() - interval '3 days',
      now() - interval '3 days'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
      user_akari,
      work_tmdb_movie,
      'watched',
      'prime_video',
      '視聴済みだけど比較用に残しているカード。',
      default_sort_order,
      now() - interval '30 days',
      now() - interval '7 days',
      now() - interval '7 days'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7',
      user_ren,
      work_tmdb_interrupted,
      'stacked',
      'apple_tv_plus',
      '他ユーザーのサンプル。',
      default_sort_order,
      now() - two_days_ago,
      now() - two_days_ago,
      now() - two_days_ago
    )
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
