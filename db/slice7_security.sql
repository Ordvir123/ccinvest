-- Slice 7 — Security hardening: restrict CMS write access to real admins.
-- Run this in your Supabase project: SQL Editor → New query → Run.
--
-- Problem fixed:
--   The previous RLS policies on public.pages and public.page_translations
--   used `to authenticated using (true)`, granting EVERY authenticated user
--   (including anyone who self-registers via the public signup API) full
--   read/write access to all CMS content.
--
-- Fix:
--   Introduce an explicit admin allow-list table + a SECURITY DEFINER helper
--   `public.is_admin()`, and gate all non-public CMS access behind it.
--   Public (anon) read access to PUBLISHED content is preserved.

-- 1) Admin allow-list table (separate from profiles to avoid privilege escalation).
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read admin list" on public.admin_users;
create policy "Admins can read admin list"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- 2) SECURITY DEFINER helper — avoids recursive RLS lookups.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  )
$$;

-- 3) Seed existing admins by email (safe to re-run).
insert into public.admin_users (user_id)
select id from auth.users
where lower(email) in ('sarah@ccinvest.co.il', 'corinne@ccinvest.co.il')
on conflict (user_id) do nothing;

-- 4) Replace permissive pages policies with admin-gated ones.
drop policy if exists "Authenticated can read all pages" on public.pages;
create policy "Admins can read all pages"
  on public.pages
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Authenticated can insert pages" on public.pages;
create policy "Admins can insert pages"
  on public.pages
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Authenticated can update pages" on public.pages;
create policy "Admins can update pages"
  on public.pages
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Authenticated can delete pages" on public.pages;
create policy "Admins can delete pages"
  on public.pages
  for delete
  to authenticated
  using (public.is_admin());

-- (Anon read of published pages policy is left untouched — public site needs it.)

-- 5) Replace permissive page_translations policy with admin-gated CRUD.
drop policy if exists "Authenticated rw translations" on public.page_translations;
create policy "Admins rw translations"
  on public.page_translations
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- (Anon read of translations for published pages policy is left untouched.)
