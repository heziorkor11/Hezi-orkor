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
