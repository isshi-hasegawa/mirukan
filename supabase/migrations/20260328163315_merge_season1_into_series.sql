-- Phase 1: シリーズ = S1 統合マイグレーション
-- series (work_type='series') が S1 を兼ねるようにする

-- 1-1. S1 のメタデータを親 series にマージ
UPDATE public.works AS series
SET
  episode_count = s1.episode_count,
  typical_episode_runtime_minutes = COALESCE(
    s1.typical_episode_runtime_minutes,
    series.typical_episode_runtime_minutes
  )
FROM public.works AS s1
WHERE s1.work_type = 'season'
  AND s1.season_number = 1
  AND s1.parent_work_id = series.id;

-- 1-2. S1 を参照する backlog_items の work_id を親 series に付け替え
UPDATE public.backlog_items AS bi
SET work_id = s1.parent_work_id
FROM public.works AS s1
WHERE bi.work_id = s1.id
  AND s1.work_type = 'season'
  AND s1.season_number = 1
  AND s1.parent_work_id IS NOT NULL;

-- 1-3. S1 season レコードを削除
DELETE FROM public.works
WHERE work_type = 'season' AND season_number = 1;

-- 1-4. 制約を差し替え: series で episode_count を許可、season は season_number > 1 のみ
ALTER TABLE public.works DROP CONSTRAINT works_season_shape_check;
ALTER TABLE public.works ADD CONSTRAINT works_season_shape_check CHECK (
  (
    work_type = 'season'
    AND parent_work_id IS NOT NULL
    AND season_number IS NOT NULL
    AND season_number > 1
    AND season_count IS NULL
    AND runtime_minutes IS NULL
  )
  OR (
    work_type = 'movie'
    AND parent_work_id IS NULL
    AND season_number IS NULL
    AND episode_count IS NULL
  )
  OR (
    work_type = 'series'
    AND parent_work_id IS NULL
    AND season_number IS NULL
  )
);

-- 1-5. ユニークインデックスを更新 (安全策: season_number > 1 のみ)
DROP INDEX IF EXISTS public.works_tmdb_season_unique_idx;
CREATE UNIQUE INDEX works_tmdb_season_unique_idx
  ON public.works (tmdb_media_type, tmdb_id, season_number)
  WHERE source_type = 'tmdb' AND work_type = 'season' AND season_number > 1;
