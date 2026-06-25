-- ============================================================
-- CC Invest — CONSOLIDATED SCHEMA (run this ONCE in the Supabase SQL editor)
-- ============================================================
-- This creates every table/policy/bucket the app needs. It is the combination
-- of slice0 + slice1 + slice4 + slice5 + slice6 + slice7, in dependency order,
-- and is safe to re-run. Run it in: Supabase Dashboard → SQL Editor → New query.
-- Without this, the `public.pages` table does not exist and publishing /
-- listing landing pages fails with a 404 ("Could not find the table").

-- ---------- enum ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'page_status') then
    create type public.page_status as enum ('draft', 'published');
  end if;
end$$;

-- ---------- pages ----------
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

grant select on public.pages to anon;
grant select, insert, update, delete on public.pages to authenticated;
grant all on public.pages to service_role;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

alter table public.pages enable row level security;

-- ---------- admin allow-list (security) ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read admin list" on public.admin_users;
create policy "Admins can read admin list"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- Seed known admins by email (safe to re-run). EDIT this list as needed.
insert into public.admin_users (user_id)
select id from auth.users
where lower(email) in ('sarah@ccinvest.co.il', 'corinne@ccinvest.co.il')
on conflict (user_id) do nothing;

-- ---------- pages policies (admin-gated writes, anon reads published) ----------
drop policy if exists "Admins can read all pages" on public.pages;
create policy "Admins can read all pages"
  on public.pages for select to authenticated using (public.is_admin());

drop policy if exists "Admins can insert pages" on public.pages;
create policy "Admins can insert pages"
  on public.pages for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins can update pages" on public.pages;
create policy "Admins can update pages"
  on public.pages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins can delete pages" on public.pages;
create policy "Admins can delete pages"
  on public.pages for delete to authenticated using (public.is_admin());

drop policy if exists "Anon can read published pages" on public.pages;
create policy "Anon can read published pages"
  on public.pages for select to anon using (status = 'published');

-- ---------- page_translations ----------
create table if not exists public.page_translations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  lang text not null,
  content jsonb not null default '{}'::jsonb,
  source_hash text,
  locked_fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (page_id, lang)
);

grant select on public.page_translations to anon;
grant select, insert, update, delete on public.page_translations to authenticated;
grant all on public.page_translations to service_role;

drop trigger if exists page_translations_set_updated_at on public.page_translations;
create trigger page_translations_set_updated_at
  before update on public.page_translations
  for each row execute function public.set_updated_at();

alter table public.page_translations enable row level security;

drop policy if exists "Admins rw translations" on public.page_translations;
create policy "Admins rw translations"
  on public.page_translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anon read translations of published pages" on public.page_translations;
create policy "Anon read translations of published pages"
  on public.page_translations for select to anon
  using (exists (
    select 1 from public.pages p
    where p.id = page_translations.page_id and p.status = 'published'
  ));

-- ---------- leads ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.pages(id) on delete set null,
  page_slug text,
  name text,
  phone text,
  email text,
  message text,
  lang text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

grant insert on public.leads to anon;
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;

alter table public.leads enable row level security;

drop policy if exists "Anon can insert leads" on public.leads;
create policy "Anon can insert leads"
  on public.leads for insert to anon with check (true);

drop policy if exists "Authenticated can read leads" on public.leads;
create policy "Authenticated can read leads"
  on public.leads for select to authenticated using (public.is_admin());

drop policy if exists "Authenticated can update leads" on public.leads;
create policy "Authenticated can update leads"
  on public.leads for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- storage bucket ----------
insert into storage.buckets (id, name, public)
values ('page-media', 'page-media', true)
on conflict (id) do nothing;

drop policy if exists "Public read page-media" on storage.objects;
create policy "Public read page-media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'page-media');

drop policy if exists "Authenticated write page-media" on storage.objects;
create policy "Authenticated write page-media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'page-media');

drop policy if exists "Authenticated update page-media" on storage.objects;
create policy "Authenticated update page-media"
  on storage.objects for update to authenticated
  using (bucket_id = 'page-media') with check (bucket_id = 'page-media');

drop policy if exists "Authenticated delete page-media" on storage.objects;
create policy "Authenticated delete page-media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'page-media');
