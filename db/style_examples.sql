-- Few-shot example bank for content generation.
-- Run this in the Supabase SQL editor for the external project.

create table if not exists public.style_examples (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null check (category in ('project','apartment')),
  raw_source text not null,      -- the cleaned WordPress content
  content jsonb not null,        -- the PageContent it should produce
  created_at timestamptz default now()
);

-- Data API grants: authenticated only. anon gets NO access.
grant select, insert, update, delete on public.style_examples to authenticated;
grant all on public.style_examples to service_role;

alter table public.style_examples enable row level security;

-- authenticated: full read/write. anon: no policy => no access.
drop policy if exists "authenticated read style_examples" on public.style_examples;
create policy "authenticated read style_examples"
  on public.style_examples for select to authenticated using (true);

drop policy if exists "authenticated write style_examples" on public.style_examples;
create policy "authenticated write style_examples"
  on public.style_examples for insert to authenticated with check (true);

drop policy if exists "authenticated update style_examples" on public.style_examples;
create policy "authenticated update style_examples"
  on public.style_examples for update to authenticated using (true) with check (true);

drop policy if exists "authenticated delete style_examples" on public.style_examples;
create policy "authenticated delete style_examples"
  on public.style_examples for delete to authenticated using (true);
