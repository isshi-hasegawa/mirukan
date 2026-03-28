do $$
declare
  user_akari constant uuid := '11111111-1111-1111-1111-111111111111';
  user_ren constant uuid := '22222222-2222-2222-2222-222222222222';
  work_manual_movie constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  work_tmdb_movie constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2';
  work_tmdb_series constant uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
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
      '00000000-0000-0000-0000-000000000000',
      user_akari,
      'authenticated',
      'authenticated',
      'akari@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      '',
      '',
      '',
      '',
      '',
      null,
      '',
      '',
      '',
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
      '',
      '',
      '',
      '',
      '',
      null,
      '',
      '',
      '',
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
      array['Drama', 'Crime'],
      75,
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
      null,
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
      work_tmdb_series,
      'interrupted',
      null,
      'netflix',
      '途中で止まっているシーズン単位のカード。',
      1000,
      now() - interval '14 days',
      now() - interval '3 days',
      now() - interval '3 days'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7',
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


do $$
begin
  -- stacked worksのseed (シリーズ→シーズンの順で親子制約を満たす)
  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 603, 'movie', NULL, 'マトリックス', 'The Matrix', 'マトリックス the matrix', 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.', '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', '1999-03-31', 136, NULL, 'very_long', NULL, NULL, NULL, '{Action,"Science Fiction"}', 75, 25, 50, '2026-03-28 07:33:25.657433+00', '2026-03-28 07:33:25.657433+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('92d6c262-9480-4086-b0b7-9b997499fced', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 1366, 'movie', NULL, 'ロッキー', 'Rocky', 'ロッキー rocky ドラマ', 'フィラデルフィアの下町。無名ボクサーのロッキーは本業だけでは食えず、借金の取りたてを請け負って日銭を稼いでいた。そんなある日、世界チャンピオンのアポロが気まぐれで無名選手にチャンスを与えようと言い出し、無作為に選んだロッキーを挑戦者に指名する。降って湧いたチャンスを得て、ロッキーは想いを寄せる女性エイドリアンに、15ラウンド最後まで戦いぬくことで自分の愛を証明すると約束する。', '/y4dh1zqKfydmPY7VmjZ0c7IbXO4.jpg', '1976-12-03', 119, NULL, 'long', NULL, NULL, NULL, '{ドラマ}', 50, 25, 50, '2026-03-28 07:48:38.232001+00', '2026-03-28 07:48:38.232001+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('322d4ce7-781a-4d20-ba62-72fdccd649bb', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 2304, 'series', NULL, 'きかんしゃトーマス', 'Thomas & Friends', 'きかんしゃトーマス thomas & friends アニメーション kids', '1943年、イギリスの牧師 ウィルバート・オードリーが、はしかにかかって病床にいる息子・クリストファーのために話して聞かせた機関車のおはなし、それが現在子どもたちに大人気の「きかんしゃトーマス」の元となるおはなしでした。

オードリー牧師は1945年から1972年の27年もの間にたくさんの作品を残しましたが、中でも1945年に出版されたトーマスの登場する「The Railway Series」はベストセラーとなり、彼の代表作となりました。

日本では、1973年にポプラ社が｢汽車のえほん｣シリーズの出版をスタートし、ロングセラーシリーズとして刊行が続いています。

1984年イギリスで、モデルアニメーション化された「きかんしゃトーマスとなかまたち」が初めて放送されるとたちまち大人気となり、現在では世界180以上の地域で55の言語による放送が行われています。

1990年には日本でもTVアニメの放送がスタートし、2020年4月からは第23シリーズをNHK Eテレで放送中。子どもたちに絶大な人気を博しています。', '/wrFb5dE2yxUjz3a5V7PEXPPzsFU.jpg', '1984-10-09', NULL, 22, 'short', NULL, 24, NULL, '{アニメーション,Kids}', 25, 75, 100, '2026-03-28 10:04:00.796499+00', '2026-03-28 10:04:00.796499+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('0e43df1a-b34d-4bd1-bb84-ff16a8f68f8b', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 210945, 'series', NULL, '鬼武者', '鬼武者', '鬼武者 鬼武者 アニメーション action & adventure sci-fi & fantasy', '魂を吸い取る鬼の篭手を手にした伝説の剣豪は、互いに固いきずなで結ばれた数人の侍とともに討伐の旅に出る。果たして、血に飢えた幻魔たちの乱を鎮めることはできるのか。', '/ei2Ugx4VK0S70aRZz3dGXlF8pi1.jpg', '2023-11-02', NULL, NULL, NULL, NULL, 1, NULL, '{アニメーション,"Action & Adventure","Sci-Fi & Fantasy"}', 25, 75, 50, '2026-03-28 10:30:50.737986+00', '2026-03-28 10:30:50.737986+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('6c0c7114-b2e4-4bb5-8658-05d9b50f4165', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 136315, 'series', NULL, '一流シェフのファミリーレストラン', 'The Bear', '一流シェフのファミリーレストラン the bear ドラマ コメディ', '若きシェフが、一筋縄ではいかない厨房スタッフとともにサンドイッチ店の改革に奮闘する。', '/yR0eUJYi3dViPtAbUavKHTx5fMB.jpg', '2022-06-23', NULL, NULL, NULL, NULL, 4, NULL, '{ドラマ,コメディ}', 25, 75, 50, '2026-03-28 12:52:30.746505+00', '2026-03-28 12:52:30.746505+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('1365278f-7fd6-4ccf-82f9-e6916b8e6d08', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 550, 'movie', NULL, 'ファイト・クラブ', 'Fight Club', 'ファイト・クラブ fight club ドラマ スリラー', '心の中に問題を抱えるエグゼクティブ青年ジャックはタイラーと名乗る男と知り合う。ふとしたことからタイラーとジャックが殴り合いを始めると、そこには多くの見物人が。その後、タイラーは酒場の地下でファイト・クラブなる拳闘の秘密集会を仕切ることに。たくさんの男たちがスリルを求めて集まるようになるが、やがてそのクラブは恐るべきテロ集団へと変貌していく……。「セブン」のコンビ、ブラピとフィンチャー監督が再び組んだ衝撃作。', '/7rNgfppzQsU7Gl6yV3eFxsXOga0.jpg', '1999-10-15', 139, NULL, 'very_long', NULL, NULL, NULL, '{ドラマ,スリラー}', 75, 0, 75, '2026-03-28 12:58:01.053361+00', '2026-03-28 12:58:01.053361+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('ae4b3f6f-2905-49b1-a918-9406551f3a5d', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 329865, 'movie', NULL, 'メッセージ', 'Arrival', 'メッセージ arrival ドラマ サイエンスフィクション 謎', '巨大な球体型宇宙船が、突如地球に降り立つ。世界中が不安と混乱に包まれる中、言語学者のルイーズは宇宙船に乗ってきた者たちの言語を解読するよう軍から依頼される。彼らが使う文字を懸命に読み解いていくと、彼女は時間をさかのぼるような不思議な感覚に陥る。やがて言語をめぐるさまざまな謎が解け、彼らが地球を訪れた思いも寄らない理由と、人類に向けられたメッセージが判明する。', '/liqvkTykQ81YbuVnmuxtnotk5CT.jpg', '2016-11-10', 116, NULL, 'long', NULL, NULL, NULL, '{ドラマ,サイエンスフィクション,謎}', 50, 25, 50, '2026-03-28 12:58:11.095433+00', '2026-03-28 12:58:11.095433+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('70fdb090-fb0c-45b5-b47c-e7b7b40ec53e', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 94605, 'series', NULL, 'アーケイン', 'Arcane', 'アーケイン arcane アニメーション action & adventure', '科学、魔法、そしてぶつかり合う信念。繁栄を遂げる都市ピルトーヴァーと、その下に広がる街ゾウンを舞台に、敵同士として戦いに身を投じる姉妹の運命を描く。', '/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg', '2021-11-06', NULL, 44, NULL, 9, 2, NULL, '{アニメーション,"Action & Adventure"}', 25, 75, 50, '2026-03-28 12:58:54.506175+00', '2026-03-28 12:58:54.506175+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('d152e344-88e8-4bb5-82d3-99ae0fe39bbb', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 86831, 'series', NULL, 'ラブ、デス&ロボット', 'Love, Death & Robots', 'ラブ、デス&ロボット love, death & robots アニメーション sci-fi & fantasy', '不気味な魔物、度肝を抜く展開、ダークな笑いなどデヴィッド・フィンチャーとティム・ミラーの世界観がさく裂。職場で視聴厳禁な大人のアニメを集めたアンソロジー。', '/vL5BQvXH96cJzmNK5n7QliQxy90.jpg', '2019-03-15', NULL, NULL, NULL, NULL, 4, NULL, '{アニメーション,"Sci-Fi & Fantasy"}', 25, 75, 50, '2026-03-28 13:00:09.86622+00', '2026-03-28 13:00:09.86622+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('e5f6d035-e9c4-4a15-9b27-53594d2f1fbd', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 94404, 'series', NULL, 'ドロヘドロ', 'ドロヘドロ', 'ドロヘドロ ドロヘドロ アニメーション action & adventure コメディ sci-fi & fantasy', '魔法によって頭をハ虫類に変えられ、記憶を失った男カイマンは、自分の本当の顔と記憶を取り戻すため、友人のニカイドウとともに"ホール"で魔法使いを狩り続ける。', '/mmpGV6laOLyNeo21aOFM9oB9HYw.jpg', '2020-01-13', NULL, 24, 'short', NULL, 2, NULL, '{アニメーション,"Action & Adventure",コメディ,"Sci-Fi & Fantasy"}', 25, 75, 0, '2026-03-28 13:00:32.874028+00', '2026-03-28 13:00:32.874028+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('c2720f69-5465-4a29-92cb-944dee988e92', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 95479, 'series', NULL, '呪術廻戦', '呪術廻戦', '呪術廻戦 呪術廻戦 アニメーション action & adventure sci-fi & fantasy', '驚異的な身体能力を持つ、少年・虎杖悠仁はごく普通の高校生活を送っていたが、ある日“呪い”に襲われた仲間を救うため、特級呪物“両面宿儺の指”を喰らい、己の魂に呪いを宿してしまう。

呪いである“両面宿儺”と肉体を共有することとなった虎杖は、最強の呪術師である五条 悟の案内で、対呪い専門機関である「東京都立呪術高等専門学校」へと。編入することになり……', '/zKFkzRn1UyE11Jv9CJjVmvmQFvR.jpg', '2020-10-03', NULL, 24, 'short', 59, 1, NULL, '{アニメーション,"Action & Adventure","Sci-Fi & Fantasy"}', 25, 75, 0, '2026-03-28 12:59:43.854125+00', '2026-03-28 13:00:49.721923+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('477da64a-78fc-45ae-8e71-0a62fe64a3e4', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 687163, 'movie', NULL, 'プロジェクト・ヘイル・メアリー', 'Project Hail Mary', 'プロジェクト・ヘイル・メアリー project hail mary サイエンスフィクション アドベンチャー', '', '/laVssxUceGPReVeLM6GVVDwXBF3.jpg', '2026-03-15', 157, NULL, 'very_long', NULL, NULL, NULL, '{サイエンスフィクション,アドベンチャー}', 50, 50, 75, '2026-03-28 13:01:20.44908+00', '2026-03-28 13:01:20.44908+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('27ce7ddd-6b0f-4e25-a848-f0e4e2c7572b', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 1054867, 'movie', NULL, 'ワン・バトル・アフター・アナザー', 'One Battle After Another', 'ワン・バトル・アフター・アナザー one battle after another スリラー 犯罪 コメディ', '元革命家の頼りない中年男ボブ。彼はさらわれた愛娘を取り戻すため、かつての仲間や謎めいた空手のセンセイの助けを借りながら、恐ろしい軍人ロックジョーに立ち向かっていく。', '/6963S9BQk07eEk8r26eaHgw0RNY.jpg', '2025-09-23', 162, NULL, 'very_long', NULL, NULL, NULL, '{スリラー,犯罪,コメディ}', 75, 0, 75, '2026-03-28 13:01:41.622887+00', '2026-03-28 13:01:41.622887+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('352f7704-c728-4674-897e-246f07b5d05f', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 965150, 'movie', NULL, 'aftersun／アフターサン', 'Aftersun', 'aftersun／アフターサン aftersun ドラマ', '思春期真っただ中、11歳のソフィ（フランキー・コリオ）は、離れて暮らす若き父・カラム（ポール・メスカル）とトルコのひなびたリゾート地にやってきた。
 輝く太陽の下、カラムが入手したビデオカメラを互いに向け合い、親密な時間をともにする。20年後、カラムと同じ年齢になったソフィ（セリア・ロールソン・ホール）は、ローファイな映像のなかに大好きだった父の、当時は知らなかった一面を見出してゆく......。', '/juooGArBKAJcxnAqslZGpUj7pWH.jpg', '2022-10-21', 101, NULL, 'long', NULL, NULL, NULL, '{ドラマ}', 50, 25, 50, '2026-03-28 13:01:51.090099+00', '2026-03-28 13:01:51.090099+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('ede3c63f-a830-418f-91f9-04957f1911ed', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 7191, 'movie', NULL, 'クローバーフィールド／HAKAISHA', 'Cloverfield', 'クローバーフィールド／hakaisha cloverfield アクション スリラー サイエンスフィクション', 'J・J・エイブラムスが、モキュメンタリーの手法で描く、巨大都市ニューヨークを舞台に“未知の何者か”が大規模な破壊を繰り広げるSFパニック・アクション超大作。とあるニューヨークの夜、日本への転属が決まり、赴任することになったロブ(マイケル・スタール＝デヴィッド)のために、大勢の仲間たちがサプライズ・パーティーを開く。そのパーティーの最中、突然、とてつもない爆音が聞こえ彼らが屋上へ行くと、まるで爆撃を受けたかのようにニューヨークの街がパニックに陥っていた。', '/647colcmebI50AZ5DWYGb79bQSW.jpg', '2008-01-15', 84, NULL, 'long', NULL, NULL, NULL, '{アクション,スリラー,サイエンスフィクション}', 75, 0, 50, '2026-03-28 13:02:24.945757+00', '2026-03-28 13:02:24.945757+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('a48cbc3a-173a-418c-94c1-8e112338a7ab', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 619778, 'movie', NULL, 'マリグナント 狂暴な悪夢', 'Malignant', 'マリグナント 狂暴な悪夢 malignant ホラー 謎', '『死霊館』『ソウ』シリーズのジェイムズ・ワン監督によるホラー。目の前で恐ろしい殺人を目撃するという悪夢に苛まれる女が、リアルな殺人現場を疑似体験し、自らの秘められた過去に導かれていく。主演は『アナベル 死霊館の人形』のアナベル・ウォーリス。', '/cURFJwGJl7cRzekODkVOzrxm7p5.jpg', '2021-09-01', 111, NULL, 'long', NULL, NULL, NULL, '{ホラー,謎}', 75, 0, 50, '2026-03-28 13:02:37.65521+00', '2026-03-28 13:02:37.65521+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('75318a8d-bf01-48bd-b09e-14e3b658b021', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 940721, 'movie', NULL, 'ゴジラ-1.0', 'ゴジラ-1.0', 'ゴジラ-1.0 ゴジラ-1.0 サイエンスフィクション ホラー アクション', '戦後、無になった日本へ追い打ちをかけるように現れたゴジラがこの国を 負 に叩き落す。史上最も絶望的な状況での襲来に、誰が?そしてどうやって?日本は立ち向かうのか―。', '/buvBq2zLP7CcJth8tjrI4znvfEO.jpg', '2023-11-03', 125, NULL, 'very_long', NULL, NULL, NULL, '{サイエンスフィクション,ホラー,アクション}', 75, 0, 75, '2026-03-28 13:03:56.413811+00', '2026-03-28 13:03:56.413811+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('6ed4dfd6-8551-440a-a589-e5de24142494', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 533535, 'movie', NULL, 'デッドプール＆ウルヴァリン', 'Deadpool & Wolverine', 'デッドプール＆ウルヴァリン deadpool & wolverine アクション コメディ サイエンスフィクション', '普通のヒーローに飽きてない？戦う動機は超個人的、破天荒でなんでもアリの“クソ無責任ヒーロー”デッドプールに世界の命運は託された！？ヒーローになんて興味はないけど、大切なファミリーの大ピンチなら頑張っちゃう！予測不可能なミッションのカギを握るのは…よりにもよって“あの爪野郎”。クソ真面目で“キレるとヤバい最恐アウトロー”ウルヴァリンに助けを求めるが…。  全く異なる個性のR指定ヒーロー２人が暴れまわる、過激なアクション・エンターテイメント！', '/bi62hYmoE3VQuYluwQGrKMCTkRd.jpg', '2024-07-24', 128, NULL, 'very_long', NULL, NULL, NULL, '{アクション,コメディ,サイエンスフィクション}', 25, 75, 75, '2026-03-28 13:02:47.150653+00', '2026-03-28 13:02:47.150653+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('73c61ccb-a5f3-4b34-8a9d-5ecbdf3754aa', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 786892, 'movie', NULL, 'マッドマックス：フュリオサ', 'Furiosa: A Mad Max Saga', 'マッドマックス：フュリオサ furiosa: a mad max saga アクション サイエンスフィクション アドベンチャー', '世界崩壊から45年。バイカー軍団に連れ去られ、すべてを奪われた若きフュリオサは故郷への帰還を誓い、MADな世界（マッドワールド）に対峙する——巨大なバイカー軍団、その頂点ディメンタス将軍は可愛い熊の人形を引っさげ改造バイクで絶叫し、さらには、白塗りの兵隊ウォーボーイズたちが神と崇めるイモータン・ジョーは鉄壁の要塞を牛耳り、互いが覇権を争っていた。生き残れるのは狂った奴だけ。怒りの戦士フュリオサよ、復讐のエンジンを鳴らせ！', '/404eyveuZRW9HkjmbolOhz59Jo7.jpg', '2024-05-22', 149, NULL, 'very_long', NULL, NULL, NULL, '{アクション,サイエンスフィクション,アドベンチャー}', 50, 50, 75, '2026-03-28 13:02:57.713668+00', '2026-03-28 13:02:57.713668+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('705ff359-9877-474b-af72-87c413e9cf87', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 76341, 'movie', NULL, 'マッドマックス 怒りのデス・ロード', 'Mad Max: Fury Road', 'マッドマックス 怒りのデス・ロード mad max: fury road アクション アドベンチャー サイエンスフィクション', '資源が底を突き荒廃した世界、愛する者も生きる望みも失い荒野をさまようマックスは、砂漠を牛耳る敵であるイモータン・ジョーの一団に捕らわれ、深い傷を負ってしまう。そんな彼の前に、ジョーの配下の女戦士フュリオサ、全身白塗りの謎の男、そしてジョーと敵対関係にあるグループが出現。マックスは彼らと手を組み、強大なジョーの勢力に戦いを挑む。〈荒廃した近未来を舞台に妻子を暴走族に殺された男の壮絶な復讐劇を描き、主演のメル・ギブソンの出世作となった『マッドマックス』シリーズ第4弾。同シリーズの生みの親であるジョージ・ミラーが再びメガホンを取り、主役を『ダークナイト　ライジング』などのトム・ハーディが受け継ぐ。共演にはオスカー女優シャーリーズ・セロン、『ウォーム・ボディーズ』などのニコラス・ホルト、1作目で暴走族のボスを演じたヒュー・キース・バーン〉', '/auGxRPeTiC5p95sWktXJ4uIi6a4.jpg', '2015-05-13', 120, NULL, 'long', NULL, NULL, NULL, '{アクション,アドベンチャー,サイエンスフィクション}', 50, 50, 50, '2026-03-28 13:03:03.974891+00', '2026-03-28 13:03:03.974891+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('eedd25b8-9e51-4539-8a5e-7eed0bc99cae', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 9659, 'movie', NULL, 'マッドマックス', 'Mad Max', 'マッドマックス mad max アドベンチャー アクション スリラー サイエンスフィクション', '舞台は近未来。凶悪化する暴走族の犯罪が問題となり警察も武装化が進んでいた。特殊警察「M.F.P.（Main Force Patrol）」の所属警官マックス・ロカタンスキーはある日追跡中の暴走族ナイトライダーを追い詰め事故死させてしまう。これが元でトーカッター率いるグループのターゲットとして狙われてしまう。親友グースや家族までもを無残な殺され方をされ、全てを奪われたマックスの復讐が今始まる。', '/altY9ce7kPqZcc02xldlYceIkXm.jpg', '1979-04-12', 94, NULL, 'long', NULL, NULL, NULL, '{アドベンチャー,アクション,スリラー,サイエンスフィクション}', 75, 0, 50, '2026-03-28 13:03:10.241735+00', '2026-03-28 13:03:10.241735+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('2e9325ca-ac8a-4bdd-817b-ac8dd185accb', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 335797, 'movie', NULL, 'SING／シング', 'Sing', 'sing／シング sing ファミリー コメディ 音楽 アニメーション', '人間世界とよく似た、動物だけが暮らす世界。コアラのバスターが劇場支配人を務める劇場は、かつての栄光は過去のものとなり、取り壊し寸前の状況にあった。バスターは劇場の再起を賭け、世界最高の歌のオーディションの開催を企画する。極度のアガリ症のゾウ、ギャングの世界から足を洗い歌手を夢見るゴリラ、我が道を貫くパンクロックなハリネズミなどなど、個性的なメンバーが人生を変えるチャンスをつかむため、5つの候補枠をめぐってオーディションに参加する。', '/dsyAzOPLfVudYepL8o3y4pQttdF.jpg', '2016-11-23', 108, NULL, 'long', NULL, NULL, NULL, '{ファミリー,コメディ,音楽,アニメーション}', 25, 75, 50, '2026-03-28 13:03:19.730359+00', '2026-03-28 13:03:19.730359+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('da28f77f-9417-478d-a650-04aa744896ce', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 1084242, 'movie', NULL, 'ズートピア2', 'Zootopia 2', 'ズートピア2 zootopia 2 アニメーション コメディ アドベンチャー ファミリー 謎', '警察学校を無事卒業し警察官となったニックと、ウサギ初の警官として以前にもまして熱心に任務に挑むジュディが再びバディを組むことに！ある日、ズートピアに突如現れたヘビ・ゲイリーをきっかけに、ジュディとニックはズートピアの過去の歴史にまつわる巨大な謎に挑むことになる。そこでジュディとニックふたりの絆もこれまで以上に試されることになるのだが…。', '/twxXtxn3bLoLQONWCRlCTrgDLpG.jpg', '2025-11-26', 108, NULL, 'long', NULL, NULL, NULL, '{アニメーション,コメディ,アドベンチャー,ファミリー,謎}', 25, 75, 50, '2026-03-28 13:03:28.521928+00', '2026-03-28 13:03:28.521928+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('b94e1d7c-894d-4ddd-8944-b2b399728767', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 926676, 'movie', NULL, 'ナワリヌイ', 'Navalny', 'ナワリヌイ navalny ドキュメンタリー', '2020 年 8 月、シベリアからモスクワへ向かう飛行機が緊急着陸した。乗客の 1 人、プーチン政権への痛烈な批判で”反体制のカリスマ”として支持を集めるロシア人政治活動家のアレクセイ・ナワリヌイが突然瀕死の状態に陥ったのだ。ナワリヌイはベルリンの病院に避難し奇跡的に一命を取り留めるが、何者かによって彼の飲み物にロシアの毒物”ノビチョク”が混入された毒殺未遂事件であったことが発覚する。プーチン大統領は即座に一切の関与を否定するが、ナワリヌイは自身の命を狙う者の正体を暴くべく、チームと命がけの調査を開始する…', '/llIJMtbJ8TlyE6bhC6adNJN0CDi.jpg', '2022-04-08', 98, NULL, 'long', NULL, NULL, NULL, '{ドキュメンタリー}', 75, 0, 50, '2026-03-28 13:03:39.452381+00', '2026-03-28 13:03:39.452381+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('f5f0bdfc-dca5-4fb9-bebd-6cd9645e6b32', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 857, 'movie', NULL, 'プライベート・ライアン', 'Saving Private Ryan', 'プライベート・ライアン saving private ryan 戦争 ドラマ 履歴', '「史上最大の作戦」ノルマンディー上陸作戦。掩蔽壕の機関銃座から猛烈な銃撃を受けながらもオマハ・ビーチ上陸作戦を生き残った米軍第5軍第2レンジャー大隊C中隊隊長のミラー大尉（トム・ハンクス）の下に、米第7軍第101空挺師団第506パラシュート歩兵連隊第1大隊B中隊に所属するジェームス・ライアン2等兵（マット・デイモン）をノルマンディー戦線から探し出し無事帰国させよ、という任務が下った。ライアン家の4人兄弟はジェームス以外の3人の兄弟が戦死し、彼が唯一の生存者であった。息子たちの帰国を本国で待つ母親に息子全員の戦死の報せが届くのはあまりに残酷だ。たった一人だけでも生かし、母親の下に息子を返してやりたいという軍上層部の配慮だった。ミラーは兵士一人を救出するために部下の命を危険にさらす任務に乗り気ではなかったが、危険極まりない敵陣深く進入し、ジェームス・ライアンを救出するための捜索を始める。', '/yjsFn9Hzp8QZFml4zGBjDqxSh4M.jpg', '1998-07-24', 169, NULL, 'very_long', NULL, NULL, NULL, '{戦争,ドラマ,履歴}', 75, 0, 75, '2026-03-28 13:04:12.054161+00', '2026-03-28 13:04:12.054161+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('77bdd175-6987-499d-9455-76401c4b95ea', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 545611, 'movie', NULL, 'エブリシング・エブリウェア・オール・アット・ワンス', 'Everything Everywhere All at Once', 'エブリシング・エブリウェア・オール・アット・ワンス everything everywhere all at once アクション アドベンチャー サイエンスフィクション', '経営するコインランドリーの税金問題、父親の介護に反抗期の娘、優しいだけで頼りにならない夫と、盛りだくさんのトラブルを抱えたエヴリン。そんな中、夫に乗り移った”別の宇宙の夫”から、「全宇宙にカオスをもたらす強大な悪を倒せるのは君だけだ」と世界の命運を託される。まさかと驚くエヴリンだが、悪の手先に襲われマルチバースにジャンプ！カンフーの達人の”別の宇宙のエヴリン”の力を得て、今、闘いが幕を開ける！', '/lSBIQml4j0VxpsrR9ruOn3rvJtT.jpg', '2022-03-24', 140, NULL, 'very_long', NULL, NULL, NULL, '{アクション,アドベンチャー,サイエンスフィクション}', 50, 50, 75, '2026-03-28 13:04:23.580074+00', '2026-03-28 13:04:23.580074+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('aeb2e6d8-0c63-4598-b574-f8a29b5d203a', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 72976, 'movie', NULL, 'リンカーン', 'Lincoln', 'リンカーン lincoln 履歴 ドラマ', 'エイブラハム・リンカーンが、大統領に再選された1865年。アメリカを内戦状態に追い込んだ南北戦争は4年目に突入したが、彼は奴隷制度を永遠に葬り去る合衆国憲法修正第13条を下院議会で批准させるまでは戦いを終わらせないという強い決意があった。そのためにも、国務長官ウィリアム・スワードらと共に憲法修正に必要な票を獲得するための議会工作に乗り出す。そんな中、学生だった長男ロバートが北軍へと入隊し……。＜スティーヴン・スピルバーグによる、第16代アメリカ合衆国大統領エイブラハム・リンカーンの伝記ドラマ。奴隷制の廃止と禁止を強固なものにし、泥沼化した南北戦争を終結させるため、憲法の修正に挑むリンカーンの戦いを重厚なタッチで映し出していく。ダニエル・デイ=ルイスがリンカーンにふんし、国と人民の未来をめぐる理想と現実に苦悩する彼の胸中を見事に体現。ジョセフ・ゴードン=レヴィットら、脇を固める実力派の妙演も見逃せない。＞', '/47xv6MQVfM1ZmPkvyAz7f7R97WX.jpg', '2012-11-09', 150, NULL, 'very_long', NULL, NULL, NULL, '{履歴,ドラマ}', 50, 25, 75, '2026-03-28 13:04:38.140121+00', '2026-03-28 13:04:38.140121+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('b3e924f5-7be5-4a37-a46e-ebba5b330b47', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 70, 'movie', NULL, 'ミリオンダラー・ベイビー', 'Million Dollar Baby', 'ミリオンダラー・ベイビー million dollar baby ドラマ', 'クリント・イーストウッドが監督・主演を務めた衝撃のヒューマン・ドラマ。厳しいボクシングの世界を題材に、そこに生きる名もなき男女の悲愴な人生模様を綴る。アカデミー賞で作品賞をはじめ主演女優、助演男優、監督賞の計４部門を受賞。  ロサンジェルスのダウンタウンにある小さなボクシング・ジムを営む老トレーナー、フランキー。その指導力に疑いのない彼だったが、選手を大切に育てるあまり、成功を急ぐ優秀なボクサーは彼のもとを去ってしまう。そんなある日、31歳になる女性マギーがジムの門を叩き、フランキーに弟子入りを志願する。13歳の時からウェイトレスで生計を立てるなど不遇の人生を送ってきた彼女は、唯一誇れるボクシングの才能に最後の望みを託したのだった。ところが、そんなマギーの必死な思いにも、頑固なフランキーは、“女性ボクサーは取らない”のひと言ですげなく追い返してしまう。それでも諦めずジムに通い、ひとり黙々と練習を続けるマギー。フランキーの唯一の親友スクラップはそんなマギーの素質と根性を見抜き、目をかける。やがてマギーの執念が勝ち、フランキーはついにトレーナーを引き受けるのだが…。', '/aDLLmgnPrEidB5WaT8ZdLuAubaW.jpg', '2004-12-05', 133, NULL, 'very_long', NULL, NULL, NULL, '{ドラマ}', 50, 25, 75, '2026-03-28 13:04:47.51033+00', '2026-03-28 13:04:47.51033+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('853aadd1-3396-4f14-9617-918ce450a07d', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 33320, 'movie', NULL, '千年女優', '千年女優', '千年女優 千年女優 ドラマ アニメーション ロマンス ファンタジー', '映像製作会社社長・立花源也は、かつて一世を風靡した大女優・藤原千代子の半生を振り返るドキュメンタリー制作を依頼された。千代子の大ファンだった立花は若いカメラマンを引き連れ、30年前に人気絶頂の中、忽然と姿を消し、以来公の場に現われなかった千代子の屋敷へ向かった。ようやく姿を現した千代子は、歳は老いても昔の清純な印象を残していた。そして、戸惑いながらも自らの人生を語り始めた。それは、女優になる前、女学生の頃に恋した名も知らぬ男性を、生涯をかけて追い求める壮大なラブ・ストーリーだった。', '/iVNCVWAqBSDU0MJCq1ehAIGifev.jpg', '2002-09-14', 87, NULL, 'long', NULL, NULL, NULL, '{ドラマ,アニメーション,ロマンス,ファンタジー}', 25, 75, 50, '2026-03-28 13:05:02.879412+00', '2026-03-28 13:05:02.879412+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('a11628da-329b-47f6-a8e6-41c557cebbae', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 575265, 'movie', NULL, 'ミッション：インポッシブル／ファイナル・レコニング', 'Mission: Impossible - The Final Reckoning', 'ミッション：インポッシブル／ファイナル・レコニング mission: impossible - the final reckoning アクション スリラー アドベンチャー', 'イーサン・ハントとチームは、世界中の諜報ネットワークに侵入した恐るべきAI「エンティティ」の捜索を続ける。世界各国の政府と、ハントの過去にまつわる謎の亡霊が彼らを追っている。新たな仲間と合流し、エンティティを永久に停止させる手段を手にしたハントは、私たちが知っている世界が永遠に変わってしまうのを防ぐため、時間との戦いに挑む。', '/aifqaY5TcsI2Lw2Shfsonk1w85w.jpg', '2025-05-17', 170, NULL, 'very_long', NULL, NULL, NULL, '{アクション,スリラー,アドベンチャー}', 75, 0, 75, '2026-03-28 13:05:12.849833+00', '2026-03-28 13:05:12.849833+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('cefdb08e-f25c-474d-b5ad-82639b615976', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 24428, 'movie', NULL, 'アベンジャーズ', 'The Avengers', 'アベンジャーズ the avengers サイエンスフィクション アクション アドベンチャー', '人知を超えた悪によってひそかに進められる地球壊滅の陰謀。それを食い止めるべく、大富豪で天才発明家アイアンマン、神々の国から地球ヘと追放された雷神ソー、感情の爆発によって容姿を激変させる科学者ハルクなどを集めた部隊アベンジャーズが結成される。しかし、各々が抱えているつらい過去や苦悩が浮き上がっては衝突し合うようになり、人類史上最大の危機に立ち向かうチームとしての機能が消失しかけていた。＜アイアンマン、ソー、ハルク、キャプテン・アメリカなど、世界的に有名なヒット作の主人公が一堂に顔を合わせるアクション大作。特殊な戦闘力を誇る者たちによって編成されたチーム「アベンジャーズ」が、地球滅亡の危機を回避する戦いに身を投じる。＞', '/l1SWn7SdwvAowNfC4ojV2B9LDgs.jpg', '2012-04-25', 144, NULL, 'very_long', NULL, NULL, NULL, '{サイエンスフィクション,アクション,アドベンチャー}', 50, 50, 75, '2026-03-28 13:05:24.534507+00', '2026-03-28 13:05:24.534507+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('1de8a895-fe87-4e03-a1b3-8cf6d0894ef1', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 561, 'movie', NULL, 'コンスタンティン', 'Constantine', 'コンスタンティン constantine ファンタジー アクション ホラー', 'ジョン・コンスタンティンには、普通の人間には見えないものが見える。末期の肺ガンに冒されてもタバコを吸い続けるヘビースモーカーである彼は、厭世的ですさんだ生活を続けていた。生まれたときから備わった「特殊な能力」で、超常現象を専門に扱う変り種の探偵を生業としている。普段は誰も気づかない、この世のわずかな空気の乱れを敏感に察知するコンスタンティン。異変はすでに起こりつつあった。友人の神父から依頼を受け、悪魔に取り憑かれた少女のもとへ赴いたコンスタンティンは、いつもの悪魔祓いの儀式の途中で、言い知れぬ恐怖を覚える。これまでとは何かが違う・・・。長い間保たれてきた天国と地獄のバランスが崩れ去ろうとしている予感。それを裏付けるようにコンスタンティンの周囲で蠢きだす不気味な出来事の数々。病魔に冒された現実と、得体の知れない謎を抱え込んだ彼のもとに、アンジェラ・ドッドソン刑事が、自殺した姉妹イザベルの死の真相を探るべく、協力を求めにやってきた。アンジェラの頼みをいったんは断ったコンスタンティンだが、その背後につきまとう悪魔の姿を見て、彼女こそが謎を解く鍵を握る人物と知る・・・・・。この世とあの世の境界線で、いったい何が起ころうとしているのか？ただひとつ確かなことは、かろうじてこの世を成り立たせてきた危ういバランスがついに崩壊を始めたということ。それは、終末への序章なのか？越えてはいけない一線を越えて、何かとてつもないことが動き出そうとしているのだ-----。', '/cn4d7u1omqn5mpEGIvOAlOaFWLc.jpg', '2005-02-08', 121, NULL, 'very_long', NULL, NULL, NULL, '{ファンタジー,アクション,ホラー}', 75, 0, 75, '2026-03-28 13:06:10.92612+00', '2026-03-28 13:06:10.92612+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('49b654f6-67c5-461a-8cb3-18a1e6430eb4', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 66732, 'series', NULL, 'ストレンジャー・シングス 未知の世界', 'Stranger Things', 'ストレンジャー・シングス 未知の世界 stranger things sci-fi & fantasy 謎 action & adventure', '姿を消した少年、人目を忍び行われる数々の実験、破壊的な超常現象、突然現れた少女。すべての不可解な謎をつなぐのは、小さな町に隠された恐ろしい秘密。', '/DGWUKWfKr03DoEDKZSR1DhNqA.jpg', '2016-07-15', NULL, NULL, NULL, NULL, 5, NULL, '{"Sci-Fi & Fantasy",謎,"Action & Adventure"}', 50, 25, 50, '2026-03-28 13:06:28.154559+00', '2026-03-28 13:06:28.154559+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('e8e26df2-786f-4309-ba1c-44cb8fe3e5bd', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 157239, 'series', NULL, 'エイリアン：アース', 'Alien: Earth', 'エイリアン：アース alien: earth sci-fi & fantasy ドラマ', '謎の宇宙船が地球に不時着する。若い女性と寄せ集めの特殊部隊メンバーは、恐ろしい生命体に遭遇し、地球最大の脅威と対峙することになる。', '/qfjlcbrIQbwdD3iX3DtD3bTjISu.jpg', '2025-08-12', NULL, NULL, NULL, NULL, 1, NULL, '{"Sci-Fi & Fantasy",ドラマ}', 50, 25, 50, '2026-03-28 13:06:44.506219+00', '2026-03-28 13:06:44.506219+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('6f5db479-d7f2-43e4-b18b-96308ff11f02', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 64254, 'series', NULL, 'マスター・オブ・ゼロ', 'Master of None', 'マスター・オブ・ゼロ master of none コメディ ドラマ', '', '/AcJM86PhgHAfbrF4dMKBaqO3cHV.jpg', '2015-11-06', NULL, NULL, NULL, NULL, 3, NULL, '{コメディ,ドラマ}', 25, 75, 50, '2026-03-28 13:07:02.012985+00', '2026-03-28 13:07:02.012985+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('70ba5c87-85d1-4dbd-a256-1c84615e174c', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 154385, 'series', NULL, 'BEEF/ビーフ', 'BEEF', 'beef/ビーフ beef コメディ ドラマ', '業績不振に悩む工事業者と、満たされない心を抱える起業家。運転中にキレて、互いを知らないままにあおり合ったふたりの間に生じた確執は、やがてそれぞれのドス黒い衝動をあぶり出していく。', '/4b4v7RnPhNyPEaVGFarEuo74r8W.jpg', '2023-04-06', NULL, NULL, NULL, NULL, 2, NULL, '{コメディ,ドラマ}', 25, 75, 50, '2026-03-28 13:07:12.103328+00', '2026-03-28 13:07:12.103328+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('395bcd82-47cd-44a0-9fa9-b7d196261826', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 126308, 'series', NULL, 'SHOGUN 将軍', 'Shōgun', 'shogun 将軍 shōgun ドラマ war & politics', '舞台は1600年の日本。吉井虎永公が、敵対勢力が団結する中、命を懸けて戦っている頃、近くの漁村に謎のヨーロッパ船が漂着しているのが発見される。', '/dQsgTPFzqqB5LrlWXmS0QkXALAT.jpg', '2024-02-27', NULL, 71, NULL, 10, 1, NULL, '{ドラマ,"War & Politics"}', 50, 25, 50, '2026-03-28 13:07:24.470789+00', '2026-03-28 13:07:24.470789+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('4dd4d70a-dde8-473a-918e-75e3a9db9fab', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 100088, 'series', NULL, 'THE LAST OF US', 'The Last of Us', 'the last of us the last of us ドラマ', '人体に寄生する菌類による感染症が発生。パンデミックから20年が経ち文明崩壊したアメリカでは、生存者による勢力争いが起こっていた。生存者の1人・ジョエルは、「ファイアフライ」の指導者・マーリーンから、身元不明の少女・エリーを隔離地域から脱出させる運び屋を任される。はじめは小さな仕事だったが、やがて壮絶な旅へ発展していき、2人は生き残りを懸け感染者がはびこるアメリカ全土を横断することに…。', '/8S6bv0xVYU4HojHD61yFF6EmYNK.jpg', '2023-01-15', NULL, 81, NULL, 9, 2, NULL, '{ドラマ}', 50, 25, 50, '2026-03-28 13:07:59.387643+00', '2026-03-28 13:08:12.647905+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 1396, 'series', NULL, 'ブレイキング・バッド', 'Breaking Bad', 'ブレイキング・バッド breaking bad ドラマ 犯罪', '家族に金を残したい―。ガンで余命宣告された冴えない高校の化学教師が、元教え子と組みドラッグ精製と売買に手を染める。', '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg', '2008-01-20', NULL, 59, NULL, 7, 5, NULL, '{ドラマ,犯罪}', 50, 25, 50, '2026-03-28 07:33:25.657433+00', '2026-03-28 13:08:42.307392+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('9bbb11ef-f533-4975-a900-76b5e2801699', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 62560, 'series', NULL, 'MR. ROBOT / ミスター・ロボット', 'Mr. Robot', 'mr. robot / ミスター・ロボット mr. robot 犯罪 ドラマ', '昼はエンジニアとして働き、夜はハッキング技術を駆使して正義を貫く青年。ある日、謎のハッカー集団にスカウトされ、世界経済を牛耳る企業に立ち向かってゆく。', '/kv1nRqgebSsREnd7vdC2pSGjpLo.jpg', '2015-06-24', NULL, NULL, NULL, NULL, 4, NULL, '{犯罪,ドラマ}', 50, 25, 50, '2026-03-28 13:08:57.855302+00', '2026-03-28 13:08:57.855302+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('e0197260-5915-4ba1-a6cf-dd5e6c8f0e4a', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 87, 'movie', NULL, 'インディ・ジョーンズ／魔宮の伝説', 'Indiana Jones and the Temple of Doom', 'インディ・ジョーンズ／魔宮の伝説 indiana jones and the temple of doom アドベンチャー アクション', '1935年、上海。あるナイトクラブで殺されかけた考古学者にして冒険家のインディはクラブの歌姫ウィリー、現地の少年ショーティを連れて逃げだす。3人が乗った飛行機は墜落し、インドの山奥に不時着。3人は寂れた村にたどり着くが、そこでその長老から神の使いだと誤解される。村は謎の邪教集団に襲撃され、宝の石を奪われ、子どもたちを奪われたという。子どもたちの救出を依頼されたインディは教団の宮殿へと向かう。', '/cuYhLypHd5kIySpRwiy8qUtLW8Z.jpg', '1984-05-23', 118, NULL, 'long', NULL, NULL, NULL, '{アドベンチャー,アクション}', 50, 50, 50, '2026-03-28 13:10:38.833441+00', '2026-03-28 13:10:38.833441+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('570fb988-f7fe-41ed-8006-bc8b3905083b', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 578, 'movie', NULL, 'ジョーズ', 'Jaws', 'ジョーズ jaws ホラー スリラー アドベンチャー', '米国ニュー・イングランド地方、アミティの小さな海水浴場でひとりの少女が鮫に襲われ、命を落とす事故が。警察署長のブロディは次なる犠牲者が出ぬよう、遊泳禁止を決定しようとするが、海水浴客がいなくなって町が不況に陥ることを恐れた市長の反対で失敗に。すると、今度は少年が犠牲になってしまう。ブロディは意を決して鮫を退治しようと、海洋学者フーパーや鮫狩りの専門家クイントとボートに乗り込み、海に出る。', '/chSUMAGawuFiPo9eCwLEoOfxYcY.jpg', '1975-06-20', 124, NULL, 'very_long', NULL, NULL, NULL, '{ホラー,スリラー,アドベンチャー}', 75, 0, 75, '2026-03-28 13:10:46.041149+00', '2026-03-28 13:10:46.041149+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('36d1247b-53a1-4580-95fd-74649b89c164', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 601, 'movie', NULL, 'E.T.', 'E.T. the Extra-Terrestrial', 'e.t. e.t. the extra-terrestrial サイエンスフィクション アドベンチャー ファミリー ファンタジー', '地球の探査にやって来て一人取り残された異星人と少年の交流を暖かく描き上げたSFファンタジー。森の中に静かに降り立つ異星の船から現れる宇宙人たち。だが彼らの地球植物の調査は人間たちの追跡によって中断される。宇宙船は急いで空に舞い上がるが一人の異星人が取り残されていた。森林にほど近い郊外に住む少年エリオットは裏庭でその異星人と遭遇、彼をかくまう事にする。兄と妹を巻き込んで、ETと名付けられたその異星人との交流が始まったが、ETの存在を知っているのはエリオットたちだけではなかった……。', '/lbudMakIqY8ui9hnBbq1ax3pAfR.jpg', '1982-06-11', 115, NULL, 'long', NULL, NULL, NULL, '{サイエンスフィクション,アドベンチャー,ファミリー,ファンタジー}', 25, 75, 50, '2026-03-28 13:10:53.805791+00', '2026-03-28 13:10:53.805791+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('86624f04-ebd4-4be9-8a9a-e8713b9a1f81', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 105, 'movie', NULL, 'バック・トゥ・ザ・フューチャー', 'Back to the Future', 'バック・トゥ・ザ・フューチャー back to the future アドベンチャー コメディ サイエンスフィクション', 'スティーブン・スピルバーグとロバート・ゼメキスが贈るSFアドベンチャーシリーズ第1弾。高校生のマーティは、科学者・ドクの発明したタイムマシン・デロリアンで過去にタイムスリップしてしまう。', '/oHaxzQXWSvIsctZfAYSW0tn54gQ.jpg', '1985-07-03', 116, NULL, 'long', NULL, NULL, NULL, '{アドベンチャー,コメディ,サイエンスフィクション}', 25, 75, 50, '2026-03-28 13:11:02.255642+00', '2026-03-28 13:11:02.255642+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('86d2861f-c8c7-46f4-8392-177188a3f434', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 348, 'movie', NULL, 'エイリアン', 'Alien', 'エイリアン alien ホラー サイエンスフィクション', '巨大な宇宙貨物船に侵入した一匹の異星生物の恐怖。地球への帰途についていた宇宙貨物船ノストロモ号は、謎の救難信号を受けて未知の惑星に降り立つ。そこには異星人の船があり、船内には無数の奇怪な卵が存在していた。卵から飛び出した奇妙な生物が顔に貼り付いた航宙士ケインを回収し、ノストロモ号は再び航海につくが、彼の体内にはすでに異星生物の幼体が産みつけられていたのだ。ケインの腹を突き破り姿を現したエイリアンは脱皮を繰り返し巨大に成長、一人また一人と乗組員を血祭りにあげていく……。', '/y860BWR69jphMYhA2gXbFlCsCDe.jpg', '1979-05-25', 117, NULL, 'long', NULL, NULL, NULL, '{ホラー,サイエンスフィクション}', 75, 0, 50, '2026-03-28 13:11:19.260786+00', '2026-03-28 13:11:19.260786+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('f6ce8de9-6f95-4fd6-b518-7c0eccfae814', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 157336, 'movie', NULL, 'インターステラー', 'Interstellar', 'インターステラー interstellar アドベンチャー ドラマ サイエンスフィクション', '近未来の地球では植物の枯死、異常気象により人類は滅亡の危機に立たされていた。元宇宙飛行士クーパーは、義父と15歳の息子トム、10歳の娘マーフとともにトウモロコシ農場を営んでいる。マーフは自分の部屋の本棚から本がひとりでに落ちる現象を幽霊のせいだと信じていたが、ある日クーパーはそれが何者かによるメッセージではないかと気が付く。クーパーとマーフはメッセージを解読し、それが指し示している秘密施設にたどり着くが、最高機密に触れたとして身柄を拘束される。', '/rgoNKrN5oEWIpfM6ZSPORbB2NYf.jpg', '2014-11-05', 169, NULL, 'very_long', NULL, NULL, NULL, '{アドベンチャー,ドラマ,サイエンスフィクション}', 50, 50, 75, '2026-03-28 13:11:27.628395+00', '2026-03-28 13:11:27.628395+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('e4027a69-d5e6-478c-ad3a-70b270d6c91a', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 376867, 'movie', NULL, 'ムーンライト', 'Moonlight', 'ムーンライト moonlight ドラマ', 'マイアミの貧困地域で、麻薬を常習している母親ポーラと暮らす少年シャロン。学校ではチビと呼ばれていじめられ、母親からは育児放棄されている彼は、何かと面倒を見てくれる麻薬ディーラーのホアンとその妻、唯一の友人のケビンだけが心の支えだった。そんな中、シャロンは同性のケビンを好きになる。そのことを誰にも言わなかった。', '/yf9fxr6ABIUmNL3wISLCO64UW08.jpg', '2016-10-21', 111, NULL, 'long', NULL, NULL, NULL, '{ドラマ}', 50, 25, 50, '2026-03-28 13:11:40.621594+00', '2026-03-28 13:11:40.621594+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('4551a343-2818-48fd-9865-25a754c5a901', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 313369, 'movie', NULL, 'ラ・ラ・ランド', 'La La Land', 'ラ・ラ・ランド la la land コメディ ドラマ ロマンス', '売れない女優とジャズピアニストの恋を、往年の名作ミュージカル映画を彷彿させるゴージャスでロマンチックな歌とダンスで描く。オーディションに落ちて意気消沈していた女優志望のミアは、ピアノの音色に誘われて入ったジャズバーで、ピアニストのセバスチャンと最悪な出会いをする。そして後日、ミアは、あるパーティ会場のプールサイドで不機嫌そうに80年代ポップスを演奏するセバスチャンと再会。初めての会話でぶつかりあう2人だったが、互いの才能と夢に惹かれ合ううちに恋に落ちていく。', '/z3sNuGYZdms8rjlV08LYjLkvzoA.jpg', '2016-12-01', 128, NULL, 'very_long', NULL, NULL, NULL, '{コメディ,ドラマ,ロマンス}', 25, 75, 75, '2026-03-28 13:11:47.684386+00', '2026-03-28 13:11:47.684386+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('6b4d1866-b94f-4025-82af-84ed32b245e2', '11111111-1111-1111-1111-111111111111', 'tmdb', 'movie', 60243, 'movie', NULL, '別離', 'جدایی نادر از سیمین', '別離 جدایی نادر از سیمین ドラマ', '娘のためにイランを出ようとする妻と離婚協議中のナデル。同居中である痴呆症の父を世話するためラジエーという女性を雇うが、思わぬ事件が巻き起こって……。ミステリーとイランの離婚問題を交錯させた秀逸ドラマ。', '/AgpTjV2eiOBK405bDOvEmHAbJQh.jpg', '2011-02-15', 123, NULL, 'very_long', NULL, NULL, NULL, '{ドラマ}', 50, 25, 75, '2026-03-28 13:12:34.194741+00', '2026-03-28 13:12:34.194741+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('6cbaa548-f6a4-467e-b343-3f87b0260440', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 86831, 'season', 'd152e344-88e8-4bb5-82d3-99ae0fe39bbb', 'ラブ、デス&ロボット シリーズ3', 'シリーズ3', 'ラブ、デス&ロボット シリーズ3 シリーズ3 アニメーション sci-fi & fantasy', 'ティム・ミラーとデヴィッド・フィンチャーによる、エミー賞受賞の短編アニメ集のシリーズ3。不気味な世界と奇妙な生物に満ちた、現実離れした物語へようこそ。', '/cRiDlzzZC5lL7fvImuSjs04SUIJ.jpg', '2022-05-20', NULL, 12, 'short', 9, NULL, 3, '{アニメーション,"Sci-Fi & Fantasy"}', 25, 75, 0, '2026-03-28 13:00:10.364327+00', '2026-03-28 13:00:10.364327+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('e47cef10-7853-4a69-80aa-25bb9f79b2c5', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 94404, 'season', 'e5f6d035-e9c4-4a15-9b27-53594d2f1fbd', 'ドロヘドロ シーズン2', 'Season2', 'ドロヘドロ シーズン2 season2 アニメーション action & adventure コメディ sci-fi & fantasy', '', '/wLMh1Mm2uTVPK3MCPm8U9NK8JVD.jpg', '2026-04-01', NULL, 24, 'short', 11, NULL, 2, '{アニメーション,"Action & Adventure",コメディ,"Sci-Fi & Fantasy"}', 25, 75, 0, '2026-03-28 13:00:33.308302+00', '2026-03-28 13:00:33.308302+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('935ed039-266c-4e9b-acf6-6fefc94aa11c', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 66732, 'season', '49b654f6-67c5-461a-8cb3-18a1e6430eb4', 'ストレンジャー・シングス 未知の世界 5', 'ストレンジャー・シングス 未知の世界 5', 'ストレンジャー・シングス 未知の世界 5 ストレンジャー・シングス 未知の世界 5 sci-fi & fantasy 謎 action & adventure', '', '/5i5Fg549J27knMvhI5NRM2FT3Gn.jpg', '2025-11-26', NULL, 72, 'long', 8, NULL, 5, '{"Sci-Fi & Fantasy",謎,"Action & Adventure"}', 50, 25, 50, '2026-03-28 13:06:28.671258+00', '2026-03-28 13:06:28.671258+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('d71fa496-2779-488c-a974-227ca4a6178a', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 64254, 'season', '6f5db479-d7f2-43e4-b18b-96308ff11f02', 'マスター・オブ・ゼロ シーズン3', 'シーズン3', 'マスター・オブ・ゼロ シーズン3 シーズン3 コメディ ドラマ', '', '/wVbtmEHKYvDZgslUqKoakJDmzYN.jpg', '2021-05-23', NULL, 57, 'medium', 5, NULL, 3, '{コメディ,ドラマ}', 25, 75, 25, '2026-03-28 13:07:02.533543+00', '2026-03-28 13:07:02.533543+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('f0641e14-c999-4dc5-951a-cecdd5507eb1', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 100088, 'season', '4dd4d70a-dde8-473a-918e-75e3a9db9fab', 'THE LAST OF US シーズン2', 'シーズン2', 'the last of us シーズン2 シーズン2 ドラマ', '感染者がはびこるアメリカ全土を横断した危険な旅から5年。ジョエルとエリーはワイオミング州ジャクソンの町の一員となり、平穏に暮らしていた。しかし、ある壮絶な出来事によって安らぎは失われ、エリーは再び危険な旅へ赴くことに...。', '/2TpP0oApo9M7dKF2MkoYKOxRbb.jpg', '2025-04-13', NULL, 59, 'medium', 7, NULL, 2, '{ドラマ}', 50, 25, 25, '2026-03-28 13:08:13.101479+00', '2026-03-28 13:08:13.101479+00')
  on conflict (id) do update set
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

  INSERT INTO public.works (id, created_by, source_type, tmdb_media_type, tmdb_id, work_type, parent_work_id, title, original_title, search_text, overview, poster_path, release_date, runtime_minutes, typical_episode_runtime_minutes, duration_bucket, episode_count, season_count, season_number, genres, focus_required_score, background_fit_score, completion_load_score, created_at, updated_at) VALUES ('0a6563dd-620b-42e6-a634-8b3e362e3050', '11111111-1111-1111-1111-111111111111', 'tmdb', 'tv', 1396, 'season', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'ブレイキング・バッド シーズン3', 'シーズン3', 'ブレイキング・バッド シーズン3 シーズン3 ドラマ 犯罪', '反省のない“どこにでもいる男”、しかし「ハイゼンバーグ」を名乗るようになって大物の貫禄を身につけたウォルター（ブライアン・クランストン）。自暴自棄な夫、家族に財産を残そうとしている父親、アルバカーキのドラッグ取引の重要人物。いくつもの人格の裏側で葛藤するウォルター。崩壊寸前の家族。情け容赦ないドラッグカルテル。危険がエスカレートしていく一方で、その複雑な世界から彼はますます抜け出せなくなっていく。', '/ffP8Q8ew048YofHRnFVM18B2fPG.jpg', '2010-03-21', NULL, 48, 'medium', 13, NULL, 3, '{ドラマ,犯罪}', 50, 25, 25, '2026-03-28 13:08:42.783773+00', '2026-03-28 13:08:42.783773+00')
  on conflict (id) do update set
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

  -- stacked backlog_itemsのseed
  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('7adb56a2-88c9-41ed-888c-205c2b837e5b', '11111111-1111-1111-1111-111111111111', '6c0c7114-b2e4-4bb5-8658-05d9b50f4165', 'stacked', NULL, NULL, NULL, 3000, '2026-03-28 12:52:30.773163+00', '2026-03-28 12:52:30.773163+00', '2026-03-28 12:52:30.773163+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'stacked', NULL, 'netflix', NULL, 4000, '2026-03-18 07:33:25.657433+00', '2026-03-28 12:53:06.438872+00', '2026-03-28 12:53:06.438872+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('346734eb-4e8d-4550-9e38-0ebea009d0d9', '11111111-1111-1111-1111-111111111111', '92d6c262-9480-4086-b0b7-9b997499fced', 'stacked', NULL, 'u_next', NULL, 5000, '2026-03-28 07:48:38.244789+00', '2026-03-28 12:53:09.068588+00', '2026-03-28 12:53:09.068588+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('06cd778e-9d0e-4c15-8f2f-6d88a7ba7b09', '11111111-1111-1111-1111-111111111111', '1365278f-7fd6-4ccf-82f9-e6916b8e6d08', 'stacked', NULL, NULL, NULL, 6000, '2026-03-28 12:58:01.065883+00', '2026-03-28 12:58:01.065883+00', '2026-03-28 12:58:01.065883+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('b4d15fc7-42cf-497d-a67d-c045271b8fa6', '11111111-1111-1111-1111-111111111111', 'ae4b3f6f-2905-49b1-a918-9406551f3a5d', 'stacked', NULL, NULL, NULL, 7000, '2026-03-28 12:58:11.107489+00', '2026-03-28 12:58:11.107489+00', '2026-03-28 12:58:11.107489+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('d1651eaf-3678-4467-9b63-bb5c0155e716', '11111111-1111-1111-1111-111111111111', '70fdb090-fb0c-45b5-b47c-e7b7b40ec53e', 'stacked', NULL, NULL, NULL, 8000, '2026-03-28 12:58:54.969653+00', '2026-03-28 12:58:54.969653+00', '2026-03-28 12:58:54.969653+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('ffb4fbf2-5fd5-4ab6-9475-eb278208c086', '11111111-1111-1111-1111-111111111111', '6cbaa548-f6a4-467e-b343-3f87b0260440', 'stacked', NULL, NULL, NULL, 10000, '2026-03-28 13:00:10.372565+00', '2026-03-28 13:00:10.372565+00', '2026-03-28 13:00:10.372565+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('b30c4762-7162-4f88-b816-d555ec248569', '11111111-1111-1111-1111-111111111111', 'e47cef10-7853-4a69-80aa-25bb9f79b2c5', 'stacked', NULL, NULL, NULL, 11000, '2026-03-28 13:00:33.315279+00', '2026-03-28 13:00:33.315279+00', '2026-03-28 13:00:33.315279+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('1cad392a-552c-4d22-a5e9-1aa9d9aec2db', '11111111-1111-1111-1111-111111111111', 'c2720f69-5465-4a29-92cb-944dee988e92', 'stacked', NULL, NULL, NULL, 12000, '2026-03-28 13:00:49.732533+00', '2026-03-28 13:00:49.732533+00', '2026-03-28 13:00:49.732533+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('47a3cf01-5df0-4e74-808e-01aa6638380b', '11111111-1111-1111-1111-111111111111', '477da64a-78fc-45ae-8e71-0a62fe64a3e4', 'stacked', NULL, NULL, NULL, 13000, '2026-03-28 13:01:20.461239+00', '2026-03-28 13:01:20.461239+00', '2026-03-28 13:01:20.461239+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('5c0f0793-42f5-47b5-a33e-2c4bcfe3655b', '11111111-1111-1111-1111-111111111111', '27ce7ddd-6b0f-4e25-a848-f0e4e2c7572b', 'stacked', NULL, NULL, NULL, 14000, '2026-03-28 13:01:41.630873+00', '2026-03-28 13:01:41.630873+00', '2026-03-28 13:01:41.630873+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('33c7540e-614e-4c48-b025-39a2443f184c', '11111111-1111-1111-1111-111111111111', '352f7704-c728-4674-897e-246f07b5d05f', 'stacked', NULL, NULL, NULL, 15000, '2026-03-28 13:01:51.100582+00', '2026-03-28 13:01:51.100582+00', '2026-03-28 13:01:51.100582+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('d88e7c45-35ea-429c-ad88-6658a939b2b2', '11111111-1111-1111-1111-111111111111', 'ede3c63f-a830-418f-91f9-04957f1911ed', 'stacked', NULL, NULL, NULL, 16000, '2026-03-28 13:02:24.953538+00', '2026-03-28 13:02:24.953538+00', '2026-03-28 13:02:24.953538+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('797fb911-d448-4308-b7e2-664532a8367c', '11111111-1111-1111-1111-111111111111', 'a48cbc3a-173a-418c-94c1-8e112338a7ab', 'stacked', NULL, NULL, NULL, 17000, '2026-03-28 13:02:37.664717+00', '2026-03-28 13:02:37.664717+00', '2026-03-28 13:02:37.664717+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('a353b50a-6ca1-4e8e-a053-f06df080af52', '11111111-1111-1111-1111-111111111111', '6ed4dfd6-8551-440a-a589-e5de24142494', 'stacked', NULL, NULL, NULL, 18000, '2026-03-28 13:02:47.160404+00', '2026-03-28 13:02:47.160404+00', '2026-03-28 13:02:47.160404+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('212885c2-1916-4f81-9fdd-547134815a2b', '11111111-1111-1111-1111-111111111111', '73c61ccb-a5f3-4b34-8a9d-5ecbdf3754aa', 'stacked', NULL, NULL, NULL, 19000, '2026-03-28 13:02:57.723913+00', '2026-03-28 13:02:57.723913+00', '2026-03-28 13:02:57.723913+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('6af26484-dc8f-4c7b-a054-2e40f7d2534d', '11111111-1111-1111-1111-111111111111', '705ff359-9877-474b-af72-87c413e9cf87', 'stacked', NULL, NULL, NULL, 20000, '2026-03-28 13:03:03.981266+00', '2026-03-28 13:03:03.981266+00', '2026-03-28 13:03:03.981266+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('3d77cacd-b8a5-45ca-9843-4ba60fcf5a69', '11111111-1111-1111-1111-111111111111', 'eedd25b8-9e51-4539-8a5e-7eed0bc99cae', 'stacked', NULL, NULL, NULL, 21000, '2026-03-28 13:03:10.251491+00', '2026-03-28 13:03:10.251491+00', '2026-03-28 13:03:10.251491+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('5fef1c09-29f6-43d6-8430-fcc264968316', '11111111-1111-1111-1111-111111111111', '2e9325ca-ac8a-4bdd-817b-ac8dd185accb', 'stacked', NULL, NULL, NULL, 22000, '2026-03-28 13:03:19.739913+00', '2026-03-28 13:03:19.739913+00', '2026-03-28 13:03:19.739913+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('48bb8536-bcc7-469c-9d78-647172bdd0d6', '11111111-1111-1111-1111-111111111111', 'da28f77f-9417-478d-a650-04aa744896ce', 'stacked', NULL, NULL, NULL, 23000, '2026-03-28 13:03:28.532742+00', '2026-03-28 13:03:28.532742+00', '2026-03-28 13:03:28.532742+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('1c567605-37e4-416a-8767-a27d9e199270', '11111111-1111-1111-1111-111111111111', 'b94e1d7c-894d-4ddd-8944-b2b399728767', 'stacked', NULL, NULL, NULL, 24000, '2026-03-28 13:03:39.461881+00', '2026-03-28 13:03:39.461881+00', '2026-03-28 13:03:39.461881+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('bc8c0ff9-0742-4b31-997a-269f5b3e2a60', '11111111-1111-1111-1111-111111111111', '75318a8d-bf01-48bd-b09e-14e3b658b021', 'stacked', NULL, NULL, NULL, 25000, '2026-03-28 13:03:56.420451+00', '2026-03-28 13:03:56.420451+00', '2026-03-28 13:03:56.420451+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('b68abe86-c892-4014-9ba5-c2ac83559075', '11111111-1111-1111-1111-111111111111', 'f5f0bdfc-dca5-4fb9-bebd-6cd9645e6b32', 'stacked', NULL, NULL, NULL, 26000, '2026-03-28 13:04:12.064261+00', '2026-03-28 13:04:12.064261+00', '2026-03-28 13:04:12.064261+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('c2650476-0c68-4e8d-a5f8-850c63c4e7a8', '11111111-1111-1111-1111-111111111111', '77bdd175-6987-499d-9455-76401c4b95ea', 'stacked', NULL, NULL, NULL, 27000, '2026-03-28 13:04:23.58923+00', '2026-03-28 13:04:23.58923+00', '2026-03-28 13:04:23.58923+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('6f7f47c6-9211-46ba-919d-e4ed1e27dd65', '11111111-1111-1111-1111-111111111111', 'aeb2e6d8-0c63-4598-b574-f8a29b5d203a', 'stacked', NULL, NULL, NULL, 28000, '2026-03-28 13:04:38.144477+00', '2026-03-28 13:04:38.144477+00', '2026-03-28 13:04:38.144477+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('28017a3d-250a-47e8-8022-23a88c3959a2', '11111111-1111-1111-1111-111111111111', 'b3e924f5-7be5-4a37-a46e-ebba5b330b47', 'stacked', NULL, NULL, NULL, 29000, '2026-03-28 13:04:47.518324+00', '2026-03-28 13:04:47.518324+00', '2026-03-28 13:04:47.518324+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('96d3e09a-034b-4830-8181-dfe92bd57d68', '11111111-1111-1111-1111-111111111111', '853aadd1-3396-4f14-9617-918ce450a07d', 'stacked', NULL, NULL, NULL, 30000, '2026-03-28 13:05:02.88946+00', '2026-03-28 13:05:02.88946+00', '2026-03-28 13:05:02.88946+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('53292a5c-fe9e-43f0-ad66-cd90799c2b06', '11111111-1111-1111-1111-111111111111', 'a11628da-329b-47f6-a8e6-41c557cebbae', 'stacked', NULL, NULL, NULL, 31000, '2026-03-28 13:05:12.860633+00', '2026-03-28 13:05:12.860633+00', '2026-03-28 13:05:12.860633+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('2fe8d776-06e1-4730-b52b-3784c2652186', '11111111-1111-1111-1111-111111111111', 'cefdb08e-f25c-474d-b5ad-82639b615976', 'stacked', NULL, NULL, NULL, 32000, '2026-03-28 13:05:24.544283+00', '2026-03-28 13:05:24.544283+00', '2026-03-28 13:05:24.544283+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('eae76e27-10f9-460a-8bd6-b1b753772336', '11111111-1111-1111-1111-111111111111', '1de8a895-fe87-4e03-a1b3-8cf6d0894ef1', 'stacked', NULL, NULL, NULL, 33000, '2026-03-28 13:06:10.936418+00', '2026-03-28 13:06:10.936418+00', '2026-03-28 13:06:10.936418+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('1d4718ff-0bf8-4237-bd49-3951c96e9e15', '11111111-1111-1111-1111-111111111111', '935ed039-266c-4e9b-acf6-6fefc94aa11c', 'stacked', NULL, NULL, NULL, 34000, '2026-03-28 13:06:28.682819+00', '2026-03-28 13:06:28.682819+00', '2026-03-28 13:06:28.682819+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('4c68ad6c-79a4-48d4-b670-c75bef5780de', '11111111-1111-1111-1111-111111111111', 'e8e26df2-786f-4309-ba1c-44cb8fe3e5bd', 'stacked', NULL, NULL, NULL, 35000, '2026-03-28 13:06:44.518515+00', '2026-03-28 13:06:44.518515+00', '2026-03-28 13:06:44.518515+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('5d2c3ba5-c829-4465-9d10-e84d1482376e', '11111111-1111-1111-1111-111111111111', 'd71fa496-2779-488c-a974-227ca4a6178a', 'stacked', NULL, NULL, NULL, 36000, '2026-03-28 13:07:02.542198+00', '2026-03-28 13:07:02.542198+00', '2026-03-28 13:07:02.542198+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('0d4a9603-be83-4485-80b7-9f6d78305845', '11111111-1111-1111-1111-111111111111', '70ba5c87-85d1-4dbd-a256-1c84615e174c', 'stacked', NULL, NULL, NULL, 37000, '2026-03-28 13:07:12.113804+00', '2026-03-28 13:07:12.113804+00', '2026-03-28 13:07:12.113804+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('d5904b12-9d94-4355-b17a-830ec91707d3', '11111111-1111-1111-1111-111111111111', '395bcd82-47cd-44a0-9fa9-b7d196261826', 'stacked', NULL, NULL, NULL, 38000, '2026-03-28 13:07:24.997193+00', '2026-03-28 13:07:24.997193+00', '2026-03-28 13:07:24.997193+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('c9a5a61e-9eba-462b-856e-b5060de89e9c', '11111111-1111-1111-1111-111111111111', '4dd4d70a-dde8-473a-918e-75e3a9db9fab', 'stacked', NULL, NULL, NULL, 39000, '2026-03-28 13:07:59.397317+00', '2026-03-28 13:07:59.397317+00', '2026-03-28 13:07:59.397317+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('588c86e4-5688-4dc2-a825-197a3bb2480f', '11111111-1111-1111-1111-111111111111', '4dd4d70a-dde8-473a-918e-75e3a9db9fab', 'stacked', NULL, NULL, NULL, 40000, '2026-03-28 13:08:06.580808+00', '2026-03-28 13:08:06.580808+00', '2026-03-28 13:08:06.580808+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('387633c8-4c79-4cee-86a7-a22ef4cda704', '11111111-1111-1111-1111-111111111111', 'f0641e14-c999-4dc5-951a-cecdd5507eb1', 'stacked', NULL, NULL, NULL, 41000, '2026-03-28 13:08:13.111908+00', '2026-03-28 13:08:13.111908+00', '2026-03-28 13:08:13.111908+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('149ace48-ffab-42ff-a59e-71db2b06509d', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'stacked', NULL, NULL, NULL, 42000, '2026-03-28 13:08:35.138988+00', '2026-03-28 13:08:35.138988+00', '2026-03-28 13:08:35.138988+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('4ea560e3-9cf0-465a-aa86-783ac0555fe9', '11111111-1111-1111-1111-111111111111', '0a6563dd-620b-42e6-a634-8b3e362e3050', 'stacked', NULL, NULL, NULL, 43000, '2026-03-28 13:08:42.794853+00', '2026-03-28 13:08:42.794853+00', '2026-03-28 13:08:42.794853+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('c8eb4bdc-b94f-4772-b18e-2dfe1ec49e47', '11111111-1111-1111-1111-111111111111', '9bbb11ef-f533-4975-a900-76b5e2801699', 'stacked', NULL, NULL, NULL, 44000, '2026-03-28 13:08:57.867705+00', '2026-03-28 13:08:57.867705+00', '2026-03-28 13:08:57.867705+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('bba1cb92-5401-4c58-bae8-9af5a495b074', '11111111-1111-1111-1111-111111111111', 'e0197260-5915-4ba1-a6cf-dd5e6c8f0e4a', 'stacked', NULL, NULL, NULL, 45000, '2026-03-28 13:10:38.846489+00', '2026-03-28 13:10:38.846489+00', '2026-03-28 13:10:38.846489+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('ef01ac5d-9a12-4348-9c4d-c1ff0110d6e4', '11111111-1111-1111-1111-111111111111', '570fb988-f7fe-41ed-8006-bc8b3905083b', 'stacked', NULL, NULL, NULL, 46000, '2026-03-28 13:10:46.048675+00', '2026-03-28 13:10:46.048675+00', '2026-03-28 13:10:46.048675+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('12c7f914-a263-4b99-8b22-e1b52900f113', '11111111-1111-1111-1111-111111111111', '36d1247b-53a1-4580-95fd-74649b89c164', 'stacked', NULL, NULL, NULL, 47000, '2026-03-28 13:10:53.814117+00', '2026-03-28 13:10:53.814117+00', '2026-03-28 13:10:53.814117+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('24df780a-0af1-46b7-9acf-25af7179a2e6', '11111111-1111-1111-1111-111111111111', '86624f04-ebd4-4be9-8a9a-e8713b9a1f81', 'stacked', NULL, NULL, NULL, 48000, '2026-03-28 13:11:02.262905+00', '2026-03-28 13:11:02.262905+00', '2026-03-28 13:11:02.262905+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('51a717a2-b676-4260-b8ec-82d5de387ae8', '11111111-1111-1111-1111-111111111111', '86d2861f-c8c7-46f4-8392-177188a3f434', 'stacked', NULL, NULL, NULL, 49000, '2026-03-28 13:11:19.26835+00', '2026-03-28 13:11:19.26835+00', '2026-03-28 13:11:19.26835+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('c7935b9e-4bb2-4301-aeae-9cefa11838f4', '11111111-1111-1111-1111-111111111111', 'f6ce8de9-6f95-4fd6-b518-7c0eccfae814', 'stacked', NULL, NULL, NULL, 50000, '2026-03-28 13:11:27.637966+00', '2026-03-28 13:11:27.637966+00', '2026-03-28 13:11:27.637966+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('c8777ec9-a638-45cd-bd97-1f137287eb41', '11111111-1111-1111-1111-111111111111', 'e4027a69-d5e6-478c-ad3a-70b270d6c91a', 'stacked', NULL, NULL, NULL, 51000, '2026-03-28 13:11:40.62854+00', '2026-03-28 13:11:40.62854+00', '2026-03-28 13:11:40.62854+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('54ab765e-6bda-4786-9363-3c65f814e7d6', '11111111-1111-1111-1111-111111111111', '4551a343-2818-48fd-9865-25a754c5a901', 'stacked', NULL, NULL, NULL, 52000, '2026-03-28 13:11:47.694585+00', '2026-03-28 13:11:47.694585+00', '2026-03-28 13:11:47.694585+00')
  on conflict (id) do update set
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

  INSERT INTO public.backlog_items (id, user_id, work_id, status, display_title, primary_platform, note, sort_order, created_at, updated_at, last_interacted_at) VALUES ('39847fe8-b8fd-4c73-bbeb-0ff14b501ba6', '11111111-1111-1111-1111-111111111111', '6b4d1866-b94f-4025-82af-84ed32b245e2', 'stacked', NULL, NULL, NULL, 53000, '2026-03-28 13:12:34.20935+00', '2026-03-28 13:12:34.20935+00', '2026-03-28 13:12:34.20935+00')
  on conflict (id) do update set
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
