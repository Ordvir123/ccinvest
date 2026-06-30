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
  one: "One parking space",
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

/** Localized rooms value, e.g. "חדרים 2" / "2 pièces" / "2 rooms". */
export function roomsValue(rooms: string, lang: ReadingLang): string {
  const n = rooms.trim();
  if (lang === "fr") return `${n} pièces`;
  if (lang === "he") return `${n} חדרים`;
  return `${n} rooms`;
}

/** Localized floor value. */
export function floorValue(floor: string, lang: ReadingLang): string {
  const n = floor.trim();
  if (lang === "fr") return n === "1" ? "1er étage" : `${n}e étage`;
  if (lang === "he") return `קומה ${n}`;
  return `${n} floor`;
}

/** Localized area / balcony value (m² in all locales). */
export function areaValue(area: string): string {
  return `${area.trim()} m²`;
}

/** Localized orientation; falls back to raw text (handled by AI translation). */
export function orientationValue(value: string, lang: ReadingLang): string {
  const map = ORIENTATION_LABELS[lang] ?? ORIENTATION_LABELS.fr;
  return (map as Record<string, string>)[value] ?? value;
}

/** Localized parking; falls back to raw text. */
export function parkingValue(value: string, lang: ReadingLang): string {
  const map = PARKING_LABELS[lang] ?? PARKING_LABELS.fr;
  return (map as Record<string, string>)[value] ?? value;
}

export const isOrientationCode = (v?: string): v is OrientationCode =>
  !!v && (ORIENTATION_CODES as string[]).includes(v);

export const isParkingCode = (v?: string): v is ParkingCode =>
  !!v && (PARKING_CODES as string[]).includes(v);
