import { acRawProducts } from "./ac-products";
import { filterRawProducts } from "./filter-products";

export type Product = {
  id: string;
  sku: string;
  oe: string;
  name: string;
  type: PartTypeId;
  category: CategoryId;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  side: string;
  condition: string;
  price?: number;
  originalPrice?: number;
  description: string;
  image?: string;
  universal?: boolean;
};

export type CategoryId =
  | "lights"
  | "mirrors"
  | "ac-compressor"
  | "ac-condenser"
  | "radiator"
  | "shocks"
  | "sensors"
  | "body"
  | "bumper"
  | "electrical"
  | "accessories"
  | "tools"
  | "cabin-filter"
  | "oil-filter";

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
  | "oil-filter";

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

export const categories: { id: CategoryId; name: string }[] = [
  { id: "lights", name: "פנסים" },
  { id: "mirrors", name: "מראות" },
  { id: "ac-compressor", name: "מדחסי מזגן" },
  { id: "ac-condenser", name: "מעבים" },
  { id: "cabin-filter", name: "פילטר מזגן" },
  { id: "oil-filter", name: "פילטר שמן" },
  { id: "radiator", name: "רדיאטורים" },
  { id: "shocks", name: "בולמים" },
  { id: "sensors", name: "חיישנים" },
  { id: "body", name: "חלקי פח" },
  { id: "bumper", name: "טמבונים" },
  { id: "electrical", name: "חשמל" },
  { id: "accessories", name: "אביזרים" },
  { id: "tools", name: "כלים" },
];

export const partTypes: { id: PartTypeId; name: string; category: CategoryId }[] = [
  { id: "headlight", name: "פנס ראשי", category: "lights" },
  { id: "taillight", name: "פנס אחורי", category: "lights" },
  { id: "foglight", name: "פנס ערפל", category: "lights" },
  { id: "mirror", name: "מראה צד", category: "mirrors" },
  { id: "compressor", name: "מדחס מזגן", category: "ac-compressor" },
  { id: "condenser", name: "מעבה מזגן", category: "ac-condenser" },
  { id: "cabin-filter", name: "פילטר מזגן", category: "cabin-filter" },
  { id: "oil-filter", name: "פילטר שמן", category: "oil-filter" },
  { id: "radiator", name: "רדיאטור", category: "radiator" },
  { id: "shock", name: "בולם זעזועים", category: "shocks" },
  { id: "sensor", name: "חיישן", category: "sensors" },
  { id: "fender", name: "כנף", category: "body" },
  { id: "bumper", name: "טמבון", category: "bumper" },
  { id: "battery", name: "מצבר / בוסטר", category: "electrical" },
  { id: "accessory", name: "אביזר כללי", category: "accessories" },
];

const demoProducts: Product[] = [];

type RawRow = {
  id: string;
  sku: string;
  oe?: string;
  name: string;
  type?: string;
  category?: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  side?: string;
  condition?: string;
  description?: string;
  image?: string;
  universal?: boolean;
};

function mapType(t?: string): PartTypeId {
  if (t === "condenser") return "condenser";
  if (t === "cabin-filter") return "cabin-filter";
  if (t === "oil-filter") return "oil-filter";
  if (t === "compressor") return "compressor";
  return (t as PartTypeId) || "compressor";
}

function mapCat(c?: string): CategoryId {
  if (c === "ac-condenser") return "ac-condenser";
  if (c === "cabin-filter") return "cabin-filter";
  if (c === "oil-filter") return "oil-filter";
  if (c === "ac-compressor") return "ac-compressor";
  return (c as CategoryId) || "ac-compressor";
}

function hydrate(rows: RawRow[]): Product[] {
  return rows.map((row) => {
    const make = row.make ?? "";
    const model = row.model ?? "";
    const yearFrom = row.yearFrom ?? 0;
    const yearTo = row.yearTo ?? 0;
    const years = yearFrom ? (yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`) : "";
    const fit = [make, model, years].filter(Boolean).join(" ");
    return {
      id: row.id,
      sku: row.sku,
      oe: row.oe ?? "",
      name: row.name,
      type: mapType(row.type),
      category: mapCat(row.category),
      make,
      model,
      yearFrom,
      yearTo,
      side: row.side ?? "",
      condition: row.condition || "חלק חדש",
      description:
        row.description ||
        `${row.name}. ${fit ? `התאמה: ${fit}.` : "יש לאשר התאמה לפי מק״ט / OE / מספר רכב."} מק״ט ${row.sku}. המחיר יאושר בוואטסאפ לפני הזמנה.`,
      image: row.image,
      universal: Boolean(row.universal || (!make && !yearFrom)),
    };
  });
}

function score(p: Product) {
  return (p.image ? 4 : 0) + (p.make ? 2 : 0) + (p.model ? 1 : 0) + (p.yearFrom ? 1 : 0);
}

export const products: Product[] = hydrate([...acRawProducts, ...filterRawProducts])
  .sort((a, b) => score(b) - score(a))
  .concat(demoProducts);

export const reviews = [
  { name: "אורן כ.", text: "מצאתי פנס לפי דגם ושנה בלי להתקשר שלוש פעמים. הגיע מהר.", stars: 5 },
  { name: "דנה ל.", text: "שלחתי מק״ט בוואטסאפ ואישרו התאמה לפני ששילמתי. ככה צריך.", stars: 5 },
  { name: "מוסך ר.", text: "ברור מה צד ומה שנים. חוסך טעויות הזמנה.", stars: 5 },
];

export const faqs = [
  {
    q: "איך מוצאים חלק לפי הרכב?",
    a: "בבורר בראש העמוד בוחרים סוג חלק, יצרן, דגם ושנה. אפשר גם לחפש לפי מק״ט או מספר OE בשורת החיפוש.",
  },
  {
    q: "מה אם החלק לא מופיע באתר?",
    a: "זה נורמלי — המלאי באתר הוא דגימה. שלחו מספר רכב, מק״ט מהחלק הישן או תמונה בוואטסאפ ונאתר התאמה.",
  },
  {
    q: "איך מזמינים ומשלמים?",
    a: "מוסיפים לסל ושולחים אלינו בוואטסאפ לאישור. אין סליקה באתר בגרסה הזו — מאשרים מחיר והתאמה לפני תשלום.",
  },
  {
    q: "יש איסוף עצמי מנהריה?",
    a: "כן. אפשר לאסוף מלוחמי הגטאות 24, נהריה, בימים א׳–ה׳ 08:00–17:00, או לקבל משלוח. משלוח ₪49, חינם מ־₪299.",
  },
  {
    q: "צריך לאשר התאמה לפני התקנה?",
    a: "כן. המחיר לפי מחירון המוסך. לפני התקנה מאשרים לפי מספר רכב או מק״ט OE — כדי לא להחליף חלק לא נכון.",
  },
] as const;

export type ProductFilter = {
  type?: string;
  make?: string;
  model?: string;
  year?: string;
  q?: string;
  category?: string;
};

export type ListingSearch = ProductFilter & { page?: number };

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr.filter(Boolean))];
}

export function filterProducts(state: ProductFilter): Product[] {
  return products.filter((p) => {
    if (state.category && p.category !== state.category) return false;
    if (state.type && p.type !== state.type) return false;
    if (state.make && p.make !== state.make) return false;
    if (state.model && p.model !== state.model) return false;
    if (state.year) {
      const y = Number(state.year);
      if (!p.universal && p.yearFrom && (y < p.yearFrom || y > p.yearTo)) return false;
    }
    if (state.q) {
      const s = state.q.trim().toLowerCase();
      const blob = [p.name, p.sku, p.oe, p.make, p.model, p.side, p.description].join(" ").toLowerCase();
      if (!blob.includes(s)) return false;
    }
    return true;
  });
}

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function categoryName(id?: string) {
  return categories.find((c) => c.id === id)?.name;
}

export function makesFor(_state?: ProductFilter) {
  return unique(products.map((p) => p.make)).sort((a, b) => a.localeCompare(b, "he"));
}

export function modelsFor(state: ProductFilter) {
  return unique(products.filter((p) => !state.make || p.make === state.make).map((p) => p.model)).sort((a, b) =>
    a.localeCompare(b, "he"),
  );
}

export function yearsFor(state: ProductFilter) {
  const years: number[] = [];
  products.forEach((p) => {
    if (state.make && p.make !== state.make) return;
    if (state.model && p.model !== state.model) return;
    if (p.yearFrom) {
      for (let y = p.yearFrom; y <= (p.yearTo || p.yearFrom); y++) years.push(y);
    }
  });
  return unique(years).sort((a, b) => b - a);
}

export function waLink(text: string) {
  return `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function fitmentLabel(product: Product) {
  const bits = [product.make, product.model].filter(Boolean);
  if (product.yearFrom) {
    bits.push(product.yearFrom === product.yearTo ? String(product.yearFrom) : `${product.yearFrom}–${product.yearTo}`);
  }
  return bits.join(" ") || "יש לאשר לפי מספר רכב";
}
