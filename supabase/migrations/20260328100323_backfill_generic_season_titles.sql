update public.works as season
set
  title = parent.title || ' シーズン' || season.season_number,
  search_text = lower(parent.title || ' シーズン' || season.season_number)
from public.works as parent
where season.work_type = 'season'
  and parent.id = season.parent_work_id
  and season.season_number is not null
  and (
    btrim(season.title) ~* '^season[[:space:]]*[0-9]+$'
    or btrim(season.title) ~ '^シーズン[[:space:]]*[0-9]+$'
    or lower(btrim(season.title)) = 'season'
    or btrim(season.title) = 'シーズン'
  );
