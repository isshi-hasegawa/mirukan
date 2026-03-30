-- manual 作品はユーザーごとに同じタイトル・種別を1件に寄せる
with ranked_manual_works as (
  select
    id,
    first_value(id) over (
      partition by created_by, work_type, search_text
      order by updated_at desc, created_at desc, id desc
    ) as canonical_id,
    row_number() over (
      partition by created_by, work_type, search_text
      order by updated_at desc, created_at desc, id desc
    ) as rn
  from public.works
  where source_type = 'manual'
    and work_type in ('movie', 'series')
),
duplicate_manual_works as (
  select id, canonical_id
  from ranked_manual_works
  where rn > 1
)
update public.backlog_items as bi
set work_id = dmw.canonical_id
from duplicate_manual_works as dmw
where bi.work_id = dmw.id;

with ranked_manual_works as (
  select
    id,
    row_number() over (
      partition by created_by, work_type, search_text
      order by updated_at desc, created_at desc, id desc
    ) as rn
  from public.works
  where source_type = 'manual'
    and work_type in ('movie', 'series')
),
duplicate_manual_works as (
  select id
  from ranked_manual_works
  where rn > 1
)
delete from public.works as w
using duplicate_manual_works as dmw
where w.id = dmw.id;

-- backlog_items はユーザーごと・作品ごとに1枚へ寄せる
with ranked_backlog_items as (
  select
    id,
    row_number() over (
      partition by user_id, work_id
      order by last_interacted_at desc nulls last, updated_at desc, created_at desc, id desc
    ) as rn
  from public.backlog_items
),
duplicate_backlog_items as (
  select id
  from ranked_backlog_items
  where rn > 1
)
delete from public.backlog_items as bi
using duplicate_backlog_items as dbi
where bi.id = dbi.id;

create unique index if not exists works_manual_title_unique_idx
  on public.works (created_by, work_type, search_text)
  where source_type = 'manual' and work_type in ('movie', 'series');

create unique index if not exists backlog_items_user_work_unique_idx
  on public.backlog_items (user_id, work_id);
