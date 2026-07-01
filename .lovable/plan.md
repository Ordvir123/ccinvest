## Goal

Replace the fixed "Apartment details" fields and plain "Features" list with a flexible, preset-driven **detail rows** model, move the title+icon picker into the details area with a Photoshop-style link/unlink toggle, manage the whole preset library in Settings, and make new-page AI creation learn from existing pages.

---

## 1. New data model: flexible detail rows

Today a unit/apartment has fixed fields (`floor`, `rooms`, `area_m2`, `balcony_m2`, `orientation`, `parking`) and a `features: string[]`. We replace both with row arrays:

```text
DetailRow = {
  presetKey?: string   // links to a preset in Settings (drives label + icon + value formatting)
  label?: string       // used when unlinked / free-text
  icon?: string        // icon name
  value: string        // number or free text
  linked?: boolean     // true = label/icon follow preset; false = overridden
}
```

- `apartment.specs: DetailRow[]` — the spec grid (Area, Rooms, Floor, …).
- `apartment.featureRows: DetailRow[]` — features (label optional, value = the feature text).
- Both are fully add/remove/reorder, any count, nothing mandatory.

**Backward compatibility:** on load, existing pages are migrated in-memory — the old fixed fields and `features[]`/`feature_icons[]` become preset-linked rows so nothing is lost. Saved pages adopt the new shape.

## 2. Preset library in Settings

Extend `TemplateSettings` with:
- `specPresets: SpecPreset[]` — seeded from the current built-ins (Floor, Rooms, Area m², Balcony m², Orientation, Parking).
- `featurePresets: SpecPreset[]` — starts empty / a few common ones.

```text
SpecPreset = {
  key: string
  icon: string
  labels: { fr, he, en }     // per-locale label so no language leakage
  valueKind: "number" | "area" | "floor" | "rooms" | "text"  // controls locale formatting
}
```

Settings page gets two management cards (Spec presets, Feature presets): add / edit / delete, edit the 3 locale labels, and pick the icon. New custom rows typed in the editor are auto-saved back here as future presets (same pattern as today's title options).

## 3. Editor: link/unlink rows

In "Apartment details" (and Features), each row renders as:

```text
[icon][ 🔗 ][ preset dropdown / label input ][ value input ][🗑]
```

- **Preset dropdown** lists presets + "Custom text…".
- **Link toggle (chain icon)**: when *linked*, label and icon are locked to the chosen preset and greyed. Clicking unlink lets you freely edit the label text and pick a different icon for that row only (without changing the shared preset).
- The section-heading title + icon picker moves out of "Section heading" and into the top of "Apartment details", using the same link/unlink pattern.
- "Add row" and "Add feature" buttons; reorder up/down; remove.

Applies identically to the repeatable **Units** blocks (project pages) so both stay consistent.

## 4. Renderer + i18n

- `PageRenderer` renders `specs`/`featureRows` generically: label from preset locale map (or custom label), icon from row, value formatted by `valueKind` (reusing existing `areaValue`/`floorValue`/`roomsValue`, plain text otherwise).
- Custom free-text labels/values flow through the existing translation pipeline; preset-linked labels use the locale map directly (no machine translation, no leakage).
- Migration keeps the current desktop two-column / mobile-stacked layout and image-side behavior.

## 5. AI learns from existing pages

`extractPageContent` (new-page flow) gains a few-shot step: it loads a small sample of the account's existing **published** pages and includes their structure + writing style as examples in the prompt, so generated drafts match tone, section usage, and spec/feature conventions. The output schema is extended to emit `specs`/`featureRows`. This reduces manual cleanup over time.

---

## Technical section (files)

- `src/types/page.ts` — add `DetailRow`, `specs`, `featureRows`; keep old fields optional for migration.
- `src/lib/template-settings.ts` — add `specPresets` + `featurePresets`, normalization, seeded defaults.
- `src/lib/pages.ts` — migrate legacy fixed fields/features → rows on load; clean rows on save.
- `src/lib/unit-i18n.ts` — generic `formatSpecValue(valueKind, value, lang)` wrapping existing formatters; preset label resolver.
- `src/components/admin/PageEditor.tsx` — new `DetailRows` editor component with link/unlink; use it for apartment specs, features, and unit blocks; move title picker into details.
- `src/components/admin/IconPicker.tsx` — reused; add a `LinkToggle` control.
- `src/routes/_admin.admin.settings.tsx` — spec/feature preset management cards.
- `src/components/page/PageRenderer.tsx` — generic row rendering for apartment + units.
- `src/lib/extract-page.functions.ts` / `extract-page.ts` — few-shot from existing pages + extended schema.
- `src/lib/translate.ts` — include custom row labels/values, exclude preset-linked labels.

## Verification

Build, then in preview: create an apartment page, add/remove/reorder spec + feature rows, link/unlink a row and confirm independent label/icon editing, manage presets in Settings, switch fr/he/en for correct labels/values and no leakage (desktop + mobile), confirm project Units still work, and generate a new page via AI to confirm it mirrors existing pages' style.

Note: this deliberately reworks the spec/feature schema (not a pure UI change) because the request is about how the data is modeled and edited.
