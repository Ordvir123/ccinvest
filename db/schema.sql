-- CC Invest — full database schema (snapshot of the live project, Oct 2026).
-- Run once on a fresh Supabase project (SQL editor or migration). Idempotent where possible.

-- ---------- types ----------
do $$ begin
  create type public.page_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

-- ---------- helpers ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- admins ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create policy "Admins can read admin list" on public.admin_users
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

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
alter table public.pages enable row level security;
create policy "Anon can read published pages" on public.pages for select to anon using (status = 'published');
create policy "Admins can read all pages" on public.pages for select to authenticated using (public.is_admin());
create policy "Admins can insert pages" on public.pages for insert to authenticated with check (public.is_admin());
create policy "Admins can update pages" on public.pages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete pages" on public.pages for delete to authenticated using (public.is_admin());
create trigger pages_set_updated_at before update on public.pages for each row execute function public.set_updated_at();

-- ---------- page history (automatic snapshot before every update/delete) ----------
create table if not exists public.page_history (
  id bigint generated always as identity primary key,
  page_id uuid not null,
  slug text,
  status text,
  content jsonb,
  seo jsonb,
  op text not null,
  changed_by uuid default auth.uid(),
  changed_at timestamptz not null default now()
);
create index if not exists page_history_page_idx on public.page_history (page_id, changed_at desc);
alter table public.page_history enable row level security;
create policy "Admins read page history" on public.page_history for select to authenticated using (public.is_admin());

create or replace function public.snapshot_page() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.page_history (page_id, slug, status, content, seo, op)
  values (old.id, old.slug, old.status::text, old.content, old.seo, tg_op);
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger pages_snapshot before update or delete on public.pages for each row execute function public.snapshot_page();

-- ---------- translations ----------
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
alter table public.page_translations enable row level security;
create policy "Anon read translations of published pages" on public.page_translations for select to anon
  using (exists (select 1 from public.pages p where p.id = page_translations.page_id and p.status = 'published'));
create policy "Admins rw translations" on public.page_translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create trigger page_translations_set_updated_at before update on public.page_translations for each row execute function public.set_updated_at();

-- ---------- media index (files live in Cloudflare R2, served at /media/<key>) ----------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  url text not null,
  folder text not null,
  filename text not null,
  content_type text not null,
  size_bytes integer not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists media_folder_idx on public.media (folder, created_at);
-- page_id links a file to its page; folder is the readable name used before the page exists.
alter table public.media
  add column if not exists page_id uuid references public.pages(id) on delete set null,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists kind text check (kind in ('photo', 'plan', 'document')),
  add column if not exists sort_order integer;
create index if not exists media_page_idx on public.media (page_id, created_at);

-- When a page is created/renamed, adopt media uploaded to a folder with that slug.
create or replace function public.adopt_media_for_page() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.media set page_id = new.id where page_id is null and folder = new.slug;
  return new;
end $$;
create trigger pages_adopt_media after insert or update of slug on public.pages
  for each row execute function public.adopt_media_for_page();
alter table public.media enable row level security;
create policy "Admins manage media" on public.media for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- style notes (what Claude has learned about how Sarah builds pages) ----------
create table if not exists public.style_notes (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('writing', 'photos', 'structure', 'translation', 'general')),
  note text not null,
  example text,
  source_page_id uuid references public.pages(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists style_notes_active_idx on public.style_notes (active, topic);
alter table public.style_notes enable row level security;
create policy "Admins manage style notes" on public.style_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

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
alter table public.leads enable row level security;
create policy "Anon can insert leads" on public.leads for insert to anon with check (true);
create policy "Authenticated can read leads" on public.leads for select to authenticated using (public.is_admin());
create policy "Authenticated can update leads" on public.leads for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- grants (Supabase defaults usually cover these) ----------
grant usage on schema public to anon, authenticated;
grant select on public.pages, public.page_translations to anon;
grant insert on public.leads to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------- hardening (Supabase security advisor) ----------
alter function public.set_updated_at() set search_path = public;
revoke execute on function public.snapshot_page() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.adopt_media_for_page() from public, anon, authenticated;
