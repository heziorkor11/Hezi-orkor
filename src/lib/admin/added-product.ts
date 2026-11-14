import type { Product, SearchHit } from "@/lib/catalog-types";
import { typeFromCategory } from "@/lib/catalog-types";
import { overlayImage, overlayStock } from "./public-overlay";

export type AddedProduct = {
  sku: string;
  name: string;
  category: string;
  subType?: string;
  fitment?: string;
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  oe?: string;
  stock?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type ProductAdditionsFile = {
  version: 1;
  description?: string;
  bySku: Record<string, AddedProduct>;
};

export type ImageOverridesFile = {
  version: 1;
  description?: string;
  bySku: Record<string, string>;
};

export type StockOverridesFile = {
  version: 1;
  bySku: Record<string, string>;
};

export function addedToSearchHit(p: AddedProduct): SearchHit {
  return {
    sku: p.sku,
    title: p.name,
    category: p.category,
    oe: p.oe || "",
    make: p.make,
    model: p.model,
    yearFrom: p.yearFrom,
    yearTo: p.yearTo,
  };
}

export function addedToProduct(p: AddedProduct): Product {
  const image = overlayImage(p.sku) || undefined;
  return {
    id: p.sku,
    sku: p.sku,
    oe: p.oe || "",
    name: p.name,
    type: typeFromCategory(p.category),
    category: p.category,
    make: p.make || "",
    model: p.model || "",
    yearFrom: p.yearFrom || 0,
    yearTo: p.yearTo || 0,
    side: "",
    condition: "new",
    description: p.fitment || "",
    image,
    vehicleFitment: p.fitment,
  };
}

export function catalogImageApiPath(sku: string) {
  return `/api/catalog-image/${encodeURIComponent(sku)}`;
}

void overlayStock;
