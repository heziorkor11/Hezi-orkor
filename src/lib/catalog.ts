import catalogManifest from "../../public/catalog/manifest.json";
import { canonicalModel, dedupeModels, sameModel } from "@/lib/model-names";

export type Product = {
  id: string;
  sku: string;
  oe: string;
  name: string;
  type: PartTypeId;
  category: string;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  side: string;
  condition: string;
  description: string;
  image?: string;
  universal?: boolean;
  vehicleFitment?: string;
};

export type CategoryId = string;

export type PartTypeId =
  | "headlight"
  | "taillight"
  | "foglight"
  | "mirror"
  | "compressor"
  | "condenser"
  | "radiator"
  | "shock"
  | "sensor"
  | "fender"
  | "bumper"
  | "battery"
  | "accessory"
  | "cabin-filter"
  | "oil-filter"
  | "brake"
  | "spark-plug"
  | "fluid"
  | "filter"
  | "ignition-coil"
  | "bulb"
  | "additive"
  | "general";

export const PAGE_SIZE = 60;

export const brand = {
  name: "Hezi Orkor",
  nameHe: "חזי אורקור",
  tagline: "WE FIX EVERYTHING",
  taglineHe: "חלפים ואביזרים לרכב — מוצאים מהר",
  phone: "052-485-8516",
  phoneTel: "972524858516",
  whatsapp: "972524858516",
  freeShipFrom: 299,
  shipping: 49,
  hours: "א׳–ה׳ 08:00–17:00",
  city: "נהריה",
  street: "לוחמי הגטאות 24",
  address: "לוחמי הגטאות 24, נהריה",
  lat: 33.0058,
  lng: 35.0989,
  mapsQuery: "לוחמי הגטאות 24 נהריה",
} as const;

export type CatalogCategory = {
  id: string;
  name: string;
  count: number;
  offset?: number;
};

export type CatalogManifest = {
  generatedAt: string;
  total: number;
  pageSize: number;
  chunkSize?: number;
  sheet: string;
  categories: CatalogCategory[];
  chunkCount: number;
  pageCount: number;
  featuredCount?: number;
};

export type SearchHit = {
  sku: string;
  title: string;
  category: string;
  oe: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
};

export type ListingCard = {
  id: string;
  sku: string;
  name: string;
  category: string;
  vehicleFitment?: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  side?: string;
  image?: string;
  oe?: string;
};

export type CatalogFacets = {
  makes: string[];
  modelsByMake: Record<string, string[]>;
  yearsByMakeModel: Record<string, number[]>;
};

export type ProductFilter = {
  type?: string;
  make?: string;
  model?: string;
  year?: string;
  q?: string;
  category?: string;
};

export type ListingSearch = ProductFilter & { page?: number };

export type ListingResult = {
  items: Product[];
  total: number;
  page: number;
  pages: number;
};

const CATEGORY_TYPE: Record<string, PartTypeId> = {
  lights: "headlight",
  lighting: "foglight",
  "ac-compressor": "compressor",
  "ac-condenser": "condenser",
  "cabin-filter": "cabin-filter",
  "oil-filter": "oil-filter",
  filters: "filter",
  brakes: "brake",
  sensors: "sensor",
  "spark-plugs": "spark-plug",
  fluids: "fluid",
  "ignition-coils": "ignition-coil",
  additives: "additive",
  general: "general",
  radiator: "radiator",
  shocks: "shock",
  mirrors: "mirror",
  body: "fender",
  bumper: "bumper",
  electrical: "battery",
  accessories: "accessory",
  tools: "accessory",
};

export function typeFromCategory(category?: string): PartTypeId {
  if (!category) return "general";
  return CATEGORY_TYPE[category] || "general";
}

export const categories: { id: string; name: string }[] = (catalogManifest.categories as CatalogCategory[]).map(
  (c) => ({ id: c.id, name: c.name }),
);

export const partTypes: { id: PartTypeId; name: string; category: string }[] = [
  { id: "headlight", name: "פנס ראשי", category: "lights" },
  { id: "taillight", name: "פנס אחורי", category: "lights" },
  { id: "foglight", name: "פנס ערפל", category: "lighting" },
  { id: "mirror", name: "מראה צד", category: "mirrors" },
  { id: "compressor", name: "מדחס מזגן", category: "ac-compressor" },
  { id: "condenser", name: "מעבה מזגן", category: "ac-condenser" },
  { id: "cabin-filter", name: "פילטר מזגן", category: "cabin-filter" },
  { id: "oil-filter", name: "פילטר שמן", category: "oil-filter" },
  { id: "filter", name: "פילטר", category: "filters" },
  { id: "brake", name: "בלמים", category: "brakes" },
  { id: "radiator", name: "רדיאטור", category: "radiator" },
  { id: "shock", name: "בולם זעזועים", category: "shocks" },
  { id: "sensor", name: "חיישן", category: "sensors" },
  { id: "spark-plug", name: "מצת", category: "spark-plugs" },
  { id: "ignition-coil", name: "סליל הצתה", category: "ignition-coils" },
  { id: "fluid", name: "שמנים ונוזלים", category: "fluids" },
  { id: "additive", name: "תוסף", category: "additives" },
  { id: "fender", name: "כנף", category: "body" },
  { id: "bumper", name: "טמבון", category: "bumper" },
  { id: "battery", name: "מצבר / בוסטר", category: "electrical" },
  { id: "accessory", name: "אביזר כללי", category: "accessories" },
  { id: "general", name: "כללי", category: "general" },
];

export const reviews = [
  { name: "אורן כ.", text: "מצאתי פנס לפי דגם ושנה בלי להתקשר שלוש פעמים. הגיע מהר.", stars: 5 },
  { name: "דנה ל.", text: "שלחתי מק״ט בוואטסאפ ואישרו התאמה לפני ששילמתי. ככה צריך.", stars: 5 },
  { name: "מוסך ר.", text: "ברור מה צד ומה שנים. חוסך טעויות הזמנה.", stars: 5 },
];

export const faqs = [
  {
    q: "איך מוצאים חלק לפי הרכב?",
    a: "בבורר בראש העמוד בוחרים קטגוריה, יצרן, דגם ושנה. אפשר גם לחפש לפי מק״ט או מספר OE בשורת החיפוש.",
  },
  {
    q: "מה אם החלק לא מופיע באתר?",
    a: "שלחו מספר רכב, מק״ט מהחלק הישן או תמונה בוואטסאפ ונאתר התאמה. אין מחירים באתר — נשלח הצעת מחיר אחרי אישור התאמה.",
  },
  {
    q: "איך מזמינים ומשלמים?",
    a: "מוסיפים לרשימת הצעת מחיר ושולחים אלינו בוואטסאפ להצעת מחיר ולבירור מלאי. אין סליקה באתר — מאשרים התאמה ומחיר לפני תשלום.",
  },
  {
    q: "יש איסוף עצמי מנהריה?",
    a: "כן. אפשר לאסוף מלוחמי הגטאות 24, נהריה, בימים א׳–ה׳ 08:00–17:00, או לקבל משלוח.",
  },
  {
    q: "צריך לאשר התאמה לפני התקנה?",
    a: "כן. לפני התקנה מאשרים לפי מספר רכב או מק״ט OE — כדי לא להחליף חלק לא נכון.",
  },
] as const;
