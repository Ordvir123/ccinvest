-- ============================================================
-- SLICE 6 — leads (lead capture)
-- ============================================================
-- Run this against your EXTERNAL Supabase project (SQL editor or CLI).
-- Safe to re-run.

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

-- Data API grants (PostgREST does not grant these by default).
-- Anon may INSERT only (the public contact form). The submit-lead edge
-- function uses the service role, but we keep a narrow anon INSERT grant
-- as a fallback path. No anon SELECT/UPDATE/DELETE.
grant insert on public.leads to anon;
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;

alter table public.leads enable row level security;

-- Anonymous public: INSERT only (no read of other people's leads).
drop policy if exists "Anon can insert leads" on public.leads;
create policy "Anon can insert leads"
  on public.leads for insert
  to anon
  with check (true);

-- Authenticated admin: read + update all leads.
drop policy if exists "Authenticated can read leads" on public.leads;
create policy "Authenticated can read leads"
  on public.leads for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can update leads" on public.leads;
create policy "Authenticated can update leads"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated can insert leads" on public.leads;
create policy "Authenticated can insert leads"
  on public.leads for insert
  to authenticated
  with check (true);
