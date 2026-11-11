import { brand } from "@/lib/brand";
import { displayCategories, isHiddenCategory } from "@/lib/display-taxonomy";
import catalogManifest from "../../public/catalog/manifest.json";
export type VehicleFitment = {
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
};

export type Product = {
  id: string;
  sku: string;
  oe: string;
  name: string;
  nameOriginal?: string;
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
  fitments?: VehicleFitment[];
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
  | "steering"
  | "suspension"
  | "clutch"
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
  | "small-engine"
  | "general";

export const PAGE_SIZE = 60;

export { brand } from "./brand";

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
  titleOriginal?: string;
  category: string;
  oe: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  fitments?: VehicleFitment[];
};

export type ListingCard = {
  id: string;
  sku: string;
  name: string;
  nameOriginal?: string;
  category: string;
  vehicleFitment?: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  side?: string;
  image?: string;
  oe?: string;
  condition?: string;
  description?: string;
  fitments?: VehicleFitment[];
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
  sub?: string;
  /** Fluids subcategory: engine | gear | brake | other */
  fluidKind?: string;
  /** Lubricant brand filter (MOTUL, TOTAL, …, אחר) */
  oilBrand?: string;
  /** Engine-oil grade parsed from the title, e.g. 5W-30 */
  viscosity?: string;
  /** Axle from the title: front | rear */
  axle?: string;
  /** Side from title tokens: left | right */
  hand?: string;
};

export type ListingSortParam = "price-asc" | "price-desc";

export type ListingSearch = ProductFilter & {
  page?: number;
  /** Listing sort. Omit for recommended (monthly deals, then cheapest). */
  sort?: ListingSortParam;
};

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
  "small-engine": "small-engine",
  fluids: "fluid",
  "ignition-coils": "ignition-coil",
  additives: "additive",
  general: "general",
  radiator: "radiator",
  shocks: "shock",
  steering: "steering",
  suspension: "suspension",
  clutch: "clutch",
  "fuel-pump": "general",
  "workshop-packs": "fluid",
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

export const categories: {id:string;name:string}[] = displayCategories;
export const visibleCategories = categories.filter((c) => c.id !== "workshop-packs" && c.id !== "general");

const allPartTypes: { id: PartTypeId; name: string; category: string }[] = [
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
  { id: "steering", name: "היגוי", category: "steering" },
  { id: "suspension", name: "מתלים", category: "suspension" },
  { id: "clutch", name: "מצמד", category: "clutch" },
  { id: "sensor", name: "חיישן", category: "sensors" },
  { id: "spark-plug", name: "מצת", category: "spark-plugs" },
  { id: "small-engine", name: "מנועים קטנים", category: "small-engine" },
  { id: "ignition-coil", name: "סליל הצתה", category: "ignition-coils" },
  { id: "fluid", name: "שמנים ונוזלים", category: "fluids" },
  { id: "additive", name: "תוסף", category: "additives" },
  { id: "fender", name: "כנף", category: "body" },
  { id: "bumper", name: "טמבון", category: "bumper" },
  { id: "battery", name: "מצבר / בוסטר", category: "electrical" },
  { id: "accessory", name: "אביזר כללי", category: "accessories" },
];

export const partTypes = allPartTypes.filter((t) => !isHiddenCategory(t.category));

export const reviews: { name: string; text: string; stars: number }[] = [];

export const faqs = [
  {
    q: "איך מוצאים חלק לפי הרכב?",
    a: "בבורר בראש העמוד בוחרים קטגוריה, יצרן, דגם ושנה. אפשר גם לחפש לפי מק״ט או מספר OE בשורת החיפוש.",
  },
  {
    q: "מה אם החלק לא מופיע באתר?",
    a: "שלחו מספר רכב, מק״ט מהחלק הישן או תמונה בוואטסאפ ונאתר התאמה. אם אין מחיר בכרטיס — נשלח הצעת מחיר אחרי אישור התאמה.",
  },
  {
    q: "איך מזמינים ומשלמים?",
    a: "מוסיפים לרשימת הצעת מחיר ושולחים אלינו בוואטסאפ להצעת מחיר ולבירור מלאי. אין סליקה באתר — מאשרים התאמה ומחיר לפני תשלום.",
  },
  {
    q: "יש איסוף עצמי מנהריה?",
    a: `כן. אפשר לאסוף מלוחמי הגטאות 24, נהריה, בימים א׳–ה׳ 08:00–17:00, או לקבל משלוח. משלוח בארץ ${brand.shipping}₪, חינם בקנייה מעל ${brand.freeShipFrom}₪.`,
  },
  {
    q: "צריך לאשר התאמה לפני התקנה?",
    a: "כן. לפני התקנה מאשרים לפי מספר רכב או מק״ט OE — כדי לא להחליף חלק לא נכון.",
  },
] as const;
