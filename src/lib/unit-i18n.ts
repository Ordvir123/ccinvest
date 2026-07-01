// Dictionary-driven localization for admin-picked unit data. Admin selects a
// code (or enters a number); the template composes the localized string per
// reading language, so values never leak untranslated across locales.

import type {
  DetailRow,
  OrientationCode,
  ParkingCode,
  ReadingLang,
  SpecPreset,
  SpecValueKind,
  Unit,
  UnitType,
} from "@/types/page";

export const UNIT_TYPES: UnitType[] = ["apartment", "penthouse", "studio", "duplex", "other"];

export const ORIENTATION_CODES: OrientationCode[] = [
  "north",
  "south",
  "east",
  "west",
  "north_east",
  "north_west",
  "south_east",
  "south_west",
];

export const PARKING_CODES: ParkingCode[] = ["one", "none"];

/** Per-locale heading for the single-apartment ("About the apartment") section. */
export const ABOUT_APARTMENT_HEADING: Record<ReadingLang, string> = {
  fr: "À propos de l'appartement",
  he: "על הדירה",
  en: "About the apartment",
};

const UNIT_TYPE_LABELS: Record<ReadingLang, Record<UnitType, string>> = {
  fr: {
    apartment: "Appartement",
    penthouse: "Penthouse",
    studio: "Studio",
    duplex: "Duplex",
    other: "",
  },
  he: { apartment: "דירה", penthouse: "פנטהאוז", studio: "סטודיו", duplex: "דופלקס", other: "" },
  en: {
    apartment: "Apartment",
    penthouse: "Penthouse",
    studio: "Studio",
    duplex: "Duplex",
    other: "",
  },
};

const ORIENTATION_LABELS: Record<ReadingLang, Record<OrientationCode, string>> = {
  fr: {
    north: "Nord",
    south: "Sud",
    east: "Est",
    west: "Ouest",
    north_east: "Nord-Est",
    north_west: "Nord-Ouest",
    south_east: "Sud-Est",
    south_west: "Sud-Ouest",
  },
  he: {
    north: "צפון",
    south: "דרום",
    east: "מזרח",
    west: "מערב",
    north_east: "צפון-מזרח",
    north_west: "צפון-מערב",
    south_east: "דרום-מזרח",
    south_west: "דרום-מערב",
  },
  en: {
    north: "North",
    south: "South",
    east: "East",
    west: "West",
    north_east: "North East",
    north_west: "North West",
    south_east: "South East",
    south_west: "South West",
  },
};

const PARKING_LABELS: Record<ReadingLang, Record<ParkingCode, string>> = {
  fr: { one: "1", none: "—" },
  he: { one: "1", none: "ללא" },
  en: { one: "1", none: "None" },
};

/** Admin-facing English labels for the editor dropdowns. */
export const UNIT_TYPE_OPTION_LABELS: Record<UnitType, string> = {
  apartment: "Apartment",
  penthouse: "Penthouse",
  studio: "Studio",
  duplex: "Duplex",
  other: "Other (custom name)",
};

export const ORIENTATION_OPTION_LABELS: Record<OrientationCode, string> = {
  north: "North",
  south: "South",
  east: "East",
  west: "West",
  north_east: "North East",
  north_west: "North West",
  south_east: "South East",
  south_west: "South West",
};

export const PARKING_OPTION_LABELS: Record<ParkingCode, string> = {
  one: "1 space",
  none: "None",
};

const has = (v?: string | null): v is string => typeof v === "string" && v.trim().length > 0;

/** Compose the localized unit title: "{translated type} {number}" with fallback. */
export function unitTitle(unit: Unit, lang: ReadingLang): string {
  // "Other" (or legacy unset) uses the free-text custom name verbatim.
  if (unit.unit_type && unit.unit_type !== "other") {
    const type = UNIT_TYPE_LABELS[lang]?.[unit.unit_type] ?? UNIT_TYPE_LABELS.fr[unit.unit_type];
    return has(unit.unit_number) ? `${type} ${unit.unit_number.trim()}` : type;
  }
  return unit.name ?? "";
}

/**
 * Parse a stored numeric field into a clean number. Returns null when the value
 * is not a bare number (legacy text like "2 pièces" / "1er étage"), so callers
 * can render it as-is without appending a (duplicate) unit label.
 */
export function parseNumericField(raw?: string | null): number | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Localized rooms value, e.g. "2 חדרים" / "2 pièces" / "2 rooms". */
export function roomsValue(rooms: string, lang: ReadingLang): string {
  const n = parseNumericField(rooms);
  if (n === null) return rooms.trim(); // legacy/edge value — never append a unit
  if (lang === "fr") return `${n} pièces`;
  if (lang === "he") return `${n} חדרים`;
  return `${n} rooms`;
}

/** Localized floor value. */
export function floorValue(floor: string, lang: ReadingLang): string {
  const n = parseNumericField(floor);
  if (n === null) return floor.trim(); // legacy/edge value — never append a unit
  if (lang === "fr") return n === 0 ? "RDC" : n === 1 ? "1er étage" : `${n}e étage`;
  if (lang === "he") return n === 0 ? "קומת קרקע" : `קומה ${n}`;
  return n === 0 ? "Ground floor" : `Floor ${n}`;
}

/** Localized area / balcony value (m² in all locales). */
export function areaValue(area: string): string {
  const n = parseNumericField(area);
  if (n === null) return area.trim(); // legacy/edge value — never append a unit
  return `${n} m²`;
}

/** Localized orientation; falls back to raw text (handled by AI translation). */
export function orientationValue(value: string, lang: ReadingLang): string {
  const map = ORIENTATION_LABELS[lang] ?? ORIENTATION_LABELS.fr;
  return (map as Record<string, string>)[value] ?? value;
}

/** Localized parking; short token next to the "Parking" label (no repetition). */
export function parkingValue(value: string, lang: ReadingLang): string {
  const map = PARKING_LABELS[lang] ?? PARKING_LABELS.fr;
  if (value in map) return (map as Record<string, string>)[value];
  const n = parseNumericField(value);
  if (n !== null) return String(n);
  // Legacy free-text values (e.g. "Une place de parking", "Sans") -> short token.
  const s = value.trim();
  if (/sans|aucun|none|ללא/i.test(s)) return map.none;
  if (/place|parking|חני|space/i.test(s)) return map.one;
  return s;
}

export const isOrientationCode = (v?: string): v is OrientationCode =>
  !!v && (ORIENTATION_CODES as string[]).includes(v);

export const isParkingCode = (v?: string): v is ParkingCode =>
  !!v && (PARKING_CODES as string[]).includes(v);

/* ============================================================
 * Flexible detail rows (specs + features) — presets & formatting.
 * ============================================================ */

/** Built-in spec presets (the original fixed fields). Merged with settings. */
export const BUILTIN_SPEC_PRESETS: SpecPreset[] = [
  {
    key: "floor",
    icon: "building",
    valueKind: "floor",
    labels: { fr: "Étage", he: "קומה", en: "Floor" },
  },
  {
    key: "rooms",
    icon: "rooms",
    valueKind: "rooms",
    labels: { fr: "Pièces", he: "חדרים", en: "Rooms" },
  },
  {
    key: "area",
    icon: "size",
    valueKind: "area",
    labels: { fr: "Surface", he: "שטח", en: "Area" },
  },
  {
    key: "balcony",
    icon: "sun",
    valueKind: "area",
    labels: { fr: "Balcon", he: "מרפסת", en: "Balcony" },
  },
  {
    key: "orientation",
    icon: "location",
    valueKind: "orientation",
    labels: { fr: "Orientation", he: "כיוון", en: "Orientation" },
  },
  {
    key: "parking",
    icon: "parking",
    valueKind: "parking",
    labels: { fr: "Parking", he: "חניה", en: "Parking" },
  },
];

/** Built-in feature presets — a few common ready-made features. */
export const BUILTIN_FEATURE_PRESETS: SpecPreset[] = [
  {
    key: "elevator",
    icon: "elevator",
    valueKind: "text",
    labels: { fr: "Ascenseur", he: "מעלית", en: "Elevator" },
  },
  {
    key: "sea_view",
    icon: "sea",
    valueKind: "text",
    labels: { fr: "Vue mer", he: "נוף לים", en: "Sea view" },
  },
  {
    key: "renovated",
    icon: "sparkles",
    valueKind: "text",
    labels: { fr: "Rénové", he: "משופצת", en: "Renovated" },
  },
  {
    key: "balcony_feat",
    icon: "sun",
    valueKind: "text",
    labels: { fr: "Balcon", he: "מרפסת", en: "Balcony" },
  },
];

/** Resolve a preset by key, preferring settings-provided presets over built-ins. */
export function resolvePreset(
  key: string | undefined,
  presets: SpecPreset[],
  builtins: SpecPreset[],
): SpecPreset | undefined {
  if (!key) return undefined;
  return presets.find((p) => p.key === key) ?? builtins.find((p) => p.key === key);
}

/** Format a spec value for a reading language given its value kind. */
export function formatSpecValue(kind: SpecValueKind, value: string, lang: ReadingLang): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  switch (kind) {
    case "floor":
      return floorValue(v, lang);
    case "rooms":
      return roomsValue(v, lang);
    case "area":
      return areaValue(v);
    case "orientation":
      return orientationValue(v, lang);
    case "parking":
      return parkingValue(v, lang);
    default:
      return v;
  }
}

/** Effective label of a row for a reading language. */
export function rowLabel(row: DetailRow, lang: ReadingLang, presets: SpecPreset[]): string {
  const preset = resolvePreset(row.presetKey, presets, BUILTIN_SPEC_PRESETS);
  if (row.linked !== false && preset) return preset.labels[lang] ?? preset.labels.fr ?? "";
  return (row.label ?? preset?.labels[lang] ?? preset?.labels.fr ?? "").trim();
}

/** Effective icon name of a row. */
export function rowIcon(row: DetailRow, presets: SpecPreset[]): string | undefined {
  const preset = resolvePreset(row.presetKey, presets, BUILTIN_SPEC_PRESETS);
  if (row.linked !== false && preset) return preset.icon;
  return row.icon || preset?.icon;
}

/** Effective, locale-formatted value of a spec row. */
export function rowValue(row: DetailRow, lang: ReadingLang, presets: SpecPreset[]): string {
  const preset = resolvePreset(row.presetKey, presets, BUILTIN_SPEC_PRESETS);
  const kind = preset?.valueKind ?? "text";
  return formatSpecValue(kind, row.value ?? "", lang);
}

/** Effective, locale-aware text of a feature row. */
export function featureRowText(row: DetailRow, lang: ReadingLang, presets: SpecPreset[]): string {
  const preset = resolvePreset(row.presetKey, presets, BUILTIN_FEATURE_PRESETS);
  if (row.linked !== false && preset) return preset.labels[lang] ?? preset.labels.fr ?? "";
  return (row.value ?? "").trim();
}

/**
 * Migrate a unit's legacy fixed fields into flexible spec rows.
 * Returns existing `specs` untouched when already present.
 */
export function migrateUnitSpecs(unit: Unit): DetailRow[] {
  if (Array.isArray(unit.specs) && unit.specs.length) return unit.specs;
  const rows: DetailRow[] = [];
  const add = (presetKey: string, value?: string) => {
    if (has(value)) rows.push({ presetKey, linked: true, value: value!.trim() });
  };
  add("floor", unit.floor);
  add("rooms", unit.rooms);
  add("area", unit.area_m2);
  add("balcony", unit.balcony_m2);
  add("orientation", unit.orientation);
  add("parking", unit.parking);
  return rows;
}

/** Migrate a unit's legacy features[] (+ icons) into feature rows. */
export function migrateUnitFeatures(unit: Unit, icons?: string[]): DetailRow[] {
  if (Array.isArray(unit.featureRows) && unit.featureRows.length) return unit.featureRows;
  return (unit.features ?? [])
    .map((f, i) => ({ value: (f ?? "").trim(), icon: icons?.[i] }))
    .filter((r) => r.value.length > 0);
}
