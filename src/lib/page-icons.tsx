import {
  ArrowUpDown,
  Award,
  Bath,
  BedDouble,
  Building2,
  Calendar,
  Car,
  Check,
  Clock,
  Coins,
  Dumbbell,
  Home,
  Key,
  Layers,
  MapPin,
  Maximize,
  Percent,
  Plane,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Train,
  TreePine,
  TrendingUp,
  Trees,
  Users,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** Curated icon set offered in the editor + used for auto-matching. */
export const ICON_MAP: Record<string, LucideIcon> = {
  building: Building2,
  home: Home,
  location: MapPin,
  ruler: Ruler,
  size: Maximize,
  rooms: BedDouble,
  bath: Bath,
  parking: Car,
  garden: TreePine,
  trees: Trees,
  sea: Waves,
  sun: Sun,
  calendar: Calendar,
  price: Coins,
  growth: TrendingUp,
  percent: Percent,
  award: Award,
  shield: ShieldCheck,
  key: Key,
  sparkles: Sparkles,
  star: Star,
  users: Users,
  wifi: Wifi,
  gym: Dumbbell,
  train: Train,
  plane: Plane,
  shopping: ShoppingBag,
  check: Check,
  layers: Layers,
  clock: Clock,
  elevator: ArrowUpDown,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name?: string): LucideIcon | null {
  if (!name) return null;
  return ICON_MAP[name] ?? null;
}

/** Keyword → icon name. Matches FR / HE / EN substrings (lowercased). */
const KEYWORDS: [RegExp, string][] = [
  [/m²|sqm|surface|superficie|שטח|מ"?ר|area|size|maximize/i, "size"],
  [/chambre|pièce|room|bed|חדר|חדרים/i, "rooms"],
  [/salle de bain|bath|shower|אמבט|מקלחת/i, "bath"],
  [/parking|garage|voiture|חני|car/i, "parking"],
  [/jardin|garden|גינה|green|vert/i, "garden"],
  [/arbre|tree|park|פארק|גן/i, "trees"],
  [/mer|sea|plage|beach|ocean|ים|חוף/i, "sea"],
  [/soleil|sun|terrasse|balcon|מרפסת|balcony|view|vue|נוף/i, "sun"],
  [/livr|delivery|date|année|year|שנה|מסיר/i, "calendar"],
  [/prix|price|€|₪|\$|מחיר|cost/i, "price"],
  [/rendement|yield|roi|return|תשואה|profit|invest/i, "growth"],
  [/%|percent|discount|אחוז|הנחה/i, "percent"],
  [/prime|award|prix|prestige|פרס|יוקרה|luxe|luxury/i, "award"],
  [/sécur|secure|safe|shield|אבטחה|בטיחות/i, "shield"],
  [/clé|key|מפתח|access/i, "key"],
  [/ascenseur|elevator|lift|מעלית/i, "elevator"],
  [/neuf|nouveau|new build|new building|brand new|חדש|בנייה חדשה/i, "sparkles"],
  [/étage|floor|level|קומה/i, "building"],
  [/résident|resident|family|tenant|דייר|תושב|people/i, "users"],
  [/wifi|internet|fiber|אינטרנט/i, "wifi"],
  [/gym|sport|fitness|כושר|מכון/i, "gym"],
  [/train|métro|metro|station|רכבת|תחבורה/i, "train"],
  [/aéroport|airport|נמל תעופה/i, "plane"],
  [/commerce|shop|mall|magasin|קני|מסחר|store/i, "shopping"],
  [/centre|center|ville|city|downtown|מרכז|עיר/i, "building"],
  [/maison|appartement|apartment|home|דירה|בית/i, "home"],
  [/heure|hour|24|temps|time|זמן|שעה/i, "clock"],
];

/** Auto-pick an icon name from arbitrary label text. */
export function guessIcon(text: string, fallback = "check"): string {
  const t = (text ?? "").toLowerCase();
  for (const [re, name] of KEYWORDS) {
    if (re.test(t)) return name;
  }
  return fallback;
}
