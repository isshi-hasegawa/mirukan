alter table public.backlog_items
  add column if not exists display_title text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'backlog_items_display_title_not_blank'
  ) then
    alter table public.backlog_items
      add constraint backlog_items_display_title_not_blank
      check (display_title is null or btrim(display_title) <> '');
  end if;
end
$$;
