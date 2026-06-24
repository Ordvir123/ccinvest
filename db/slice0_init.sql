-- CC Invest — SLICE 0 schema
-- Run this against your EXTERNAL Supabase project (SQL editor or CLI migration).

-- 1) Page status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'page_status') then
    create type public.page_status as enum ('draft', 'published');
  end if;
end$$;

-- 2) pages table
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status public.page_status not null default 'draft',
  source_lang text not null default 'fr',
  content jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Data API grants (PostgREST does not grant these by default)
grant select on public.pages to anon;
grant select, insert, update, delete on public.pages to authenticated;
grant all on public.pages to service_role;

-- 4) keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- 5) Row Level Security
alter table public.pages enable row level security;

-- Authenticated admin: full read/write on all rows.
drop policy if exists "Authenticated can read all pages" on public.pages;
create policy "Authenticated can read all pages"
  on public.pages for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can insert pages" on public.pages;
create policy "Authenticated can insert pages"
  on public.pages for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update pages" on public.pages;
create policy "Authenticated can update pages"
  on public.pages for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated can delete pages" on public.pages;
create policy "Authenticated can delete pages"
  on public.pages for delete
  to authenticated
  using (true);

-- Anonymous public: read only published rows (looked up by slug).
drop policy if exists "Anon can read published pages" on public.pages;
create policy "Anon can read published pages"
  on public.pages for select
  to anon
  using (status = 'published');

-- 6) Storage bucket: public read, authenticated write
insert into storage.buckets (id, name, public)
values ('page-media', 'page-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read page-media" on storage.objects;
create policy "Public read page-media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'page-media');

drop policy if exists "Authenticated write page-media" on storage.objects;
create policy "Authenticated write page-media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'page-media');

drop policy if exists "Authenticated update page-media" on storage.objects;
create policy "Authenticated update page-media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'page-media')
  with check (bucket_id = 'page-media');

drop policy if exists "Authenticated delete page-media" on storage.objects;
create policy "Authenticated delete page-media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'page-media');
