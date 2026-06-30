# Landing-page (project) template fixes

All changes are template/presentation + admin editor + the `Unit` JSON schema. Units live inside `pages.content` JSON, so **no DB column/migration is needed**; file uploads reuse the existing public media bucket. Work spans `he`, `en`, `fr`.

## 1. Green buttons (CTA token reuse)
- The Home hero CTA uses the green `--cta` token (`bg-cta` / `hover:bg-cta/90`). The contact Send button already uses `bg-cta`; the **project hero "Contact us" button** in `PageRenderer.Hero` currently uses `variant="secondary"` + `bg-card text-primary` (white).
- Change the project hero CTA to `bg-cta text-cta-foreground hover:bg-cta/90`. Confirm Send button matches. No new hex — reuse `--cta`.

## 2. Per-unit preview file (image or PDF)
- Extend `Unit` type: `attachment?: { url: string; type: "image" | "pdf" }`.
- Allow PDF in `uploadPageMedia` (`application/pdf`, skip compression for PDFs); the page-media bucket is already public.
- New `UnitFileUpload` control in `MediaUpload.tsx` (accepts png/jpg/webp/pdf). Add it to each unit in the editor, labelled with the localized "Floor plan" word.
- Render on `UnitCard`: image → inline thumbnail opening a lightbox; pdf → small "floor plan" card/icon opening the PDF in a new tab; none → render nothing.

## 3. Enlarge hero logo
- In `PageRenderer.Hero`, increase logo from `h-10 md:h-14` to roughly `h-16 md:h-24`, increase white-pill padding (`px-5 py-3`/`px-6 py-4`), keep centered. Keep current `brandLogoUrl` asset.

## 4. Near-full translation of dynamic unit data (structural)
New dictionary-driven rendering in `PageRenderer`, plus editor dropdowns. Admin enters codes/numbers; the template composes the localized string per `lang`.

- **a) Unit type** — add `unit_type?: "apartment"|"penthouse"|"studio"|"duplex"` + `unit_number?: string`. Render `{translated type} {number}`. Keep legacy free-text `name` as a fallback when `unit_type` is unset (back-compat with existing pages/seed).
- **b) Numeric attributes** — `rooms`, `floor`, `area_m2`, `balcony_m2` are numbers; template adds the localized label/unit (`pièces`/`חדרים`/`rooms`; floor patterns `{n}er/e étage` / `קומה {n}` / `{n} floor`; `m²` everywhere).
- **c) Orientation & parking** — closed dropdowns mapped to a dictionary (N/S/E/W + combos; parking one-space / none). Free-text fallback still runs through the existing AI translation engine.
- **d) Street / proper names** — add per-locale manual fields (`location_name` map: `{fr,he,en}`) so the admin types the correct spelling per language; excluded from machine translation.
- **Translation cache integration**: remove `units.*.floor` / `units.*.orientation` (and not-add the new dictionary/number/per-locale fields) from `listTranslatableFields`, and carry these stable fields across languages in `preserveStableFields` so switching locale doesn't drop them. Only free-text `description`, `features`, and fallback `name` keep going through AI translation.

## 5. Bottom spacing under contact form
- Add generous bottom padding to the contact section wrapper / below the Send button so the form isn't flush to the viewport bottom, verified on mobile.

## 6. Stat icons cleanup
- Improve the icon mapping (`guessIcon` / per-stat icon resolution) so floors→building, new building→sparkle/badge, parking→car, elevator→elevator icon render distinctly, keeping the existing circular styling. Applies to the rendered stat row; admin can still override via IconPicker.

## Global / verification
- Hebrew RTL, en/fr LTR preserved; green `--cta` and navy `#05286F` untouched.
- After build, load a sample project page, switch all 3 languages, and confirm: no untranslated unit titles or `pièces` leakage, green buttons everywhere, legible logo, image+PDF previews work, comfortable bottom spacing.

## Technical notes (non-user-facing)
- Files: `src/types/page.ts`, `src/components/page/PageRenderer.tsx`, `src/components/page/ContactForm.tsx`, `src/components/admin/PageEditor.tsx`, `src/components/admin/MediaUpload.tsx`, `src/lib/pages.ts` (upload mime), `src/lib/translate.ts` (field list + preserve), plus the localized "Floor plan" label (added to the renderer's `LABELS` map, not the i18n JSON, since these are reading-language labels).
- Back-compat: existing pages with free-text `name`/`floor`/`orientation` still render via fallbacks; no data migration required.
