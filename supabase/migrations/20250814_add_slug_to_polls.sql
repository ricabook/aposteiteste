-- Add slug column to polls and backfill
create extension if not exists unaccent with schema extensions;

alter table public.polls add column if not exists slug text;

update public.polls p set slug = lower(
  regexp_replace(
    regexp_replace(extensions.unaccent(p.title), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  )
)
where p.slug is null or p.slug = '';

-- Ensure uniqueness by appending -<shortid> when duplicates appear
do $$
declare
  r record;
begin
  for r in
    select slug, array_agg(id) ids
    from public.polls
    group by slug
    having count(*) > 1
  loop
    for i in 2 .. array_length(r.ids,1) loop
      update public.polls
      set slug = r.slug || '-' || split_part(r.ids[i]::text, '-', 1)
      where id = r.ids[i];
    end loop;
  end loop;
end $$;

create unique index if not exists polls_slug_key on public.polls (slug);
alter table public.polls alter column slug set not null;
