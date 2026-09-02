import { acPreviewProducts } from "./ac-products";

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
  | "tools";

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
  | "accessory";

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
  { id: "radiator", name: "רדיאטור", category: "radiator" },
  { id: "shock", name: "בולם זעזועים", category: "shocks" },
  { id: "sensor", name: "חיישן", category: "sensors" },
  { id: "fender", name: "כנף", category: "body" },
  { id: "bumper", name: "טמבון", category: "bumper" },
  { id: "battery", name: "מצבר / בוסטר", category: "electrical" },
  { id: "accessory", name: "אביזר כללי", category: "accessories" },
];

export const products: Product[] = [];
