-- Global template settings for a fresh project (cleaned: the old project had 80+ one-off
-- "presets" that were really per-page text; those now live as free text inside each page).
insert into public.pages (slug, status, source_lang, content)
values ('__template_settings__', 'published', 'he', $j${
  "settings": {
    "brandName": "CC Invest",
    "brandLogoUrl": "/brand/cc-invest-logo.png",
    "contactBgUrl": "",
    "primaryColor": "",
    "defaultCtaLabel": "",
    "defaultContactHeading": "",
    "apartmentTitleOptions": [{ "icon": "home", "label": "À propos de l'appartement" }],
    "specPresets": [
      { "key": "floor",       "icon": "building", "valueKind": "floor",       "labels": { "fr": "Étage",       "he": "קומה",   "en": "Floor" } },
      { "key": "rooms",       "icon": "rooms",    "valueKind": "rooms",       "labels": { "fr": "Pièces",      "he": "חדרים",  "en": "Rooms" } },
      { "key": "area",        "icon": "size",     "valueKind": "area",        "labels": { "fr": "Surface",     "he": "שטח",    "en": "Area" } },
      { "key": "balcony",     "icon": "sun",      "valueKind": "area",        "labels": { "fr": "Balcon",      "he": "מרפסת",  "en": "Balcony" } },
      { "key": "orientation", "icon": "location", "valueKind": "orientation", "labels": { "fr": "Orientation", "he": "כיוון",  "en": "Orientation" } },
      { "key": "parking",     "icon": "parking",  "valueKind": "parking",     "labels": { "fr": "Parking",     "he": "חניה",   "en": "Parking" } }
    ],
    "featurePresets": [
      { "key": "elevator",     "icon": "elevator", "valueKind": "text", "labels": { "fr": "Ascenseur", "he": "מעלית",     "en": "Elevator" } },
      { "key": "sea_view",     "icon": "sea",      "valueKind": "text", "labels": { "fr": "Vue mer",   "he": "נוף לים",   "en": "Sea view" } },
      { "key": "renovated",    "icon": "sparkles", "valueKind": "text", "labels": { "fr": "Rénové",    "he": "משופצת",    "en": "Renovated" } },
      { "key": "balcony_feat", "icon": "sun",      "valueKind": "text", "labels": { "fr": "Balcon",    "he": "מרפסת",     "en": "Balcony" } }
    ]
  }
}$j$::jsonb)
on conflict (slug) do nothing;
