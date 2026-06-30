// Dictionary-driven localization for admin-picked unit data. Admin selects a
// code (or enters a number); the template composes the localized string per
// reading language, so values never leak untranslated across locales.

import type {
  OrientationCode,
  ParkingCode,
  ReadingLang,
  Unit,
  UnitType,
} from "@/types/page";

export const UNIT_TYPES: UnitType[] = ["apartment", "penthouse", "studio", "duplex"];

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

const UNIT_TYPE_LABELS: Record<ReadingLang, Record<UnitType, string>> = {
  fr: { apartment: "Appartement", penthouse: "Penthouse", studio: "Studio", duplex: "Duplex" },
  he: { apartment: "דירה", penthouse: "פנטהאוז", studio: "סטודיו", duplex: "דופלקס" },
  en: { apartment: "Apartment", penthouse: "Penthouse", studio: "Studio", duplex: "Duplex" },
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
  if (unit.unit_type) {
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
