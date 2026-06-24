-- CC Invest — SLICE 1 schema + seed
-- Run against your EXTERNAL Supabase project after db/slice0_init.sql.

-- 1) page_translations table
create table if not exists public.page_translations (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  lang text not null,                 -- 'he' | 'en'
  content jsonb not null default '{}'::jsonb,
  source_hash text,                   -- hash of source content (for later invalidation)
  updated_at timestamptz not null default now(),
  unique (page_id, lang)
);

-- 2) Data API grants
grant select on public.page_translations to anon;
grant select, insert, update, delete on public.page_translations to authenticated;
grant all on public.page_translations to service_role;

-- 3) keep updated_at fresh (reuses public.set_updated_at from slice0)
drop trigger if exists page_translations_set_updated_at on public.page_translations;
create trigger page_translations_set_updated_at
  before update on public.page_translations
  for each row execute function public.set_updated_at();

-- 4) RLS
alter table public.page_translations enable row level security;

drop policy if exists "Authenticated rw translations" on public.page_translations;
create policy "Authenticated rw translations"
  on public.page_translations for all
  to authenticated
  using (true)
  with check (true);

-- Anon may read a translation only if its parent page is published.
drop policy if exists "Anon read translations of published pages" on public.page_translations;
create policy "Anon read translations of published pages"
  on public.page_translations for select
  to anon
  using (
    exists (
      select 1 from public.pages p
      where p.id = page_translations.page_id
        and p.status = 'published'
    )
  );

-- 5) Seed: Montefiore / Allenby (published, source FR)
insert into public.pages (slug, status, source_lang, content, seo)
values (
  'montefiore-allenby',
  'published',
  'fr',
  '{
    "hero": { "kicker":"À VENDRE - TLV", "title":"Projet Montefiore / Allenby",
      "subtitle":"Nouvel immeuble de 6 étages à proximité de la mer et du marché",
      "cta_label":"Contact Us" },
    "stats":[{"value":"1","label":"immeuble neuf"},{"value":"6","label":"ÉTAGES"},
      {"value":"1","label":"PARKING"},{"value":"1","label":"ASCENSEUR"}],
    "location":{"heading":"Emplacement idéal","map_query":"Montefiore Allenby Tel Aviv",
      "text":"L''immeuble se situe à l''angle des rues Montefiore et Allenby près de la Grande Synagogue en cours de rénovation, à la fois près du marché et de la mer mais aussi des commerces et cafés au centre de la ville."},
    "about":{"heading":"À propos du projet",
      "body":"Le projet est un immeuble neuf de 6 étages conçu par l''architecte réputé Bar Orian, accompagné par la banque Benleumi. Des prestations hôtelières de qualité sont mises à disposition des locataires : salle de sport, salle de laverie, lobby luxueux, parkings souterrains, balcons / terrasses. Reste à la vente 17 appartements de 2 et 3 pièces, livraison Avril 2027, conditions de paiement très intéressantes."},
    "gallery":[ {"url":"https://placehold.co/800x600?text=Gallery+1"},
      {"url":"https://placehold.co/800x600?text=Gallery+2"},
      {"url":"https://placehold.co/800x600?text=Gallery+3"},
      {"url":"https://placehold.co/800x600?text=Gallery+4"} ],
    "units":[
      {"name":"Appartement 4","floor":"1er étage","orientation":"Est","rooms":"2 pièces","area_m2":"61","balcony_m2":"6.5","parking":"1","price":"5.850.000 ₪","description":"À l''avant sur Allenby. Salon avec balcon, cuisine, une chambre, salle de douche et toilettes."},
      {"name":"Appartement 22","floor":"1er étage","orientation":"Nord-Ouest","rooms":"2 pièces","area_m2":"50.7","balcony_m2":"13","parking":"1","price":"5.950.000 ₪","description":"Terrasse de 13m². Salon avec balcon, cuisine, une chambre, salle de douche et toilettes."},
      {"name":"Appartement 26","floor":"1er étage","orientation":"Nord","rooms":"2 pièces","area_m2":"43.9","parking":"1","price":"3.990.000 ₪","description":"Salon, cuisine, une chambre, salle de douche et toilettes."},
      {"name":"Penthouse 28","floor":"6ème étage","orientation":"Est","rooms":"2 pièces","area_m2":"48","balcony_m2":"40.5","parking":"1","price":"7.640.000 ₪","description":"Terrasse de 40.5m². Salon avec terrasse, cuisine, chambre avec accès terrasse, salle de douche et toilettes."},
      {"name":"Penthouse 29","floor":"6ème étage","orientation":"Nord-Est","rooms":"2 pièces","area_m2":"60","balcony_m2":"25","parking":"1","price":"8.100.000 ₪","description":"Terrasse de 25m². Salon avec terrasse, cuisine, une chambre, salle de douche et toilettes."}
    ],
    "videos":[],
    "contact":{"heading":"Plus d''informations sur ce projet ?"}
  }'::jsonb,
  '{
    "meta_title":"Montefiore / Allenby - CCInvest",
    "meta_description":"À VENDRE – TLV. Nouvel immeuble de 6 étages à proximité de la mer et du marché. 17 appartements de 2 et 3 pièces, livraison Avril 2027.",
    "canonical":"/montefiore-allenby"
  }'::jsonb
)
on conflict (slug) do update
  set status = excluded.status,
      source_lang = excluded.source_lang,
      content = excluded.content,
      seo = excluded.seo;
