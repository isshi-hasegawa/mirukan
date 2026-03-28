-- Update primary_platform enum to include hulu and apple_tv, remove theater and other
-- Create new enum type with updated values
create type public.primary_platform_new as enum (
  'netflix',
  'prime_video',
  'u_next',
  'disney_plus',
  'hulu',
  'apple_tv_plus',
  'apple_tv'
);

-- Change the column type in backlog_items
alter table public.backlog_items
  alter column primary_platform
  set data type public.primary_platform_new
  using (
    case
      when primary_platform::text = 'theater' then null
      when primary_platform::text = 'other' then null
      else primary_platform::text::public.primary_platform_new
    end
  );

-- Drop the old type
drop type public.primary_platform;

-- Rename the new type
alter type public.primary_platform_new rename to primary_platform;
