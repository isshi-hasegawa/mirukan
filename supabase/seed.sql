do $$
declare
  user_akari constant uuid := '11111111-1111-1111-1111-111111111111';
  user_ren constant uuid := '22222222-2222-2222-2222-222222222222';
  work_manual_movie constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  work_tmdb_movie constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  work_tmdb_series constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  work_tmdb_season constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  )
  values
    (
      '00000000-0000-0000-0000-000000000000',
      user_akari,
      'authenticated',
      'authenticated',
      'akari@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Akari"}',
      now(),
      now(),
      false,
      false
    ),
    (
      '00000000-0000-0000-0000-000000000000',
      user_ren,
      'authenticated',
      'authenticated',
      'ren@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
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
      format('{"sub":"%s","email":"%s"}', user_akari, 'akari@example.com')::jsonb,
      'email',
      'akari@example.com',
      now(),
      now(),
      now()
    ),
    (
      '33333333-3333-3333-3333-333333333332',
      user_ren,
      format('{"sub":"%s","email":"%s"}', user_ren, 'ren@example.com')::jsonb,
      'email',
      'ren@example.com',
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
      'movie',
      null,
      'あの日の街角',
      null,
      'あの日の街角',
      '配信では見つからなかったので手動で積んだ、しっとり系のヒューマンドラマ。',
      null,
      '2018-04-13',
      95,
      null,
      'long',
      null,
      null,
      null,
      array['Drama', 'Family'],
      50,
      25,
      25
    ),
    (
      work_tmdb_movie,
      user_akari,
      'tmdb',
      'movie',
      603,
      'movie',
      null,
      'The Matrix',
      'The Matrix',
      'the matrix matrix',
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
      'Breaking Bad',
      'Breaking Bad',
      'breaking bad',
      'A high school chemistry teacher turned meth producer navigates danger, pride, and family collapse.',
      '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
      '2008-01-20',
      null,
      47,
      'medium',
      null,
      5,
      null,
      array['Drama', 'Crime'],
      75,
      0,
      100
    ),
    (
      work_tmdb_season,
      user_akari,
      'tmdb',
      'tv',
      1396,
      'season',
      work_tmdb_series,
      'Breaking Bad Season 1',
      'Breaking Bad Season 1',
      'breaking bad season 1',
      'Walter White takes his first steps into the drug trade.',
      '/1BP4xYv9ZG4PjHFmHlhNgCA89iL.jpg',
      '2008-01-20',
      null,
      47,
      'medium',
      7,
      null,
      1,
      array['Drama', 'Crime'],
      75,
      0,
      50
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
    display_title,
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
      'other',
      '配信先不明。週末に腰を据えて観たい。',
      1000,
      now() - interval '5 days',
      now() - interval '2 days',
      now() - interval '2 days'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
      user_akari,
      work_tmdb_movie,
      'want_to_watch',
      'The Matrix (再見候補)',
      'prime_video',
      '久しぶりに観直したい。',
      2000,
      now() - interval '4 days',
      now() - interval '1 day',
      now() - interval '1 day'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
      user_akari,
      work_tmdb_movie,
      'watched',
      null,
      'prime_video',
      '視聴済みだけど比較用に残しているカード。',
      1000,
      now() - interval '30 days',
      now() - interval '7 days',
      now() - interval '7 days'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
      user_akari,
      work_tmdb_series,
      'watching',
      null,
      'netflix',
      '今月の平日夜に少しずつ進める。',
      1000,
      now() - interval '10 days',
      now() - interval '12 hours',
      now() - interval '12 hours'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
      user_akari,
      work_tmdb_season,
      'interrupted',
      'Breaking Bad S1',
      'netflix',
      '途中で止まっているシーズン単位のカード。',
      1000,
      now() - interval '14 days',
      now() - interval '3 days',
      now() - interval '3 days'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6',
      user_ren,
      work_tmdb_movie,
      'stacked',
      null,
      'apple_tv_plus',
      '他ユーザーのサンプル。',
      1000,
      now() - interval '2 days',
      now() - interval '2 days',
      now() - interval '2 days'
    )
  on conflict (id) do update
  set
    user_id = excluded.user_id,
    work_id = excluded.work_id,
    status = excluded.status,
    display_title = excluded.display_title,
    primary_platform = excluded.primary_platform,
    note = excluded.note,
    sort_order = excluded.sort_order,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    last_interacted_at = excluded.last_interacted_at;
end
$$;
