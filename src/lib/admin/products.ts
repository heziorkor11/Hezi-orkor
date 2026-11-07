import type { Product, SearchHit } from "../catalog-types";
import { typeFromCategory } from "../catalog-types";
import type { ProductOverride } from "./types";
/** No changes to source catalog: created products live entirely in the adapter. */
export function createdProduct(sku: string, row?: ProductOverride): Product | undefined {
  if (!row?.created || !row.name || !row.category) return undefined;
  return {
    id: sku,
    sku,
    name: row.name,
    brand: row.brand || "",
    nameOriginal: row.name,
    category: row.category,
    type: typeFromCategory(row.category),
    oe: "",
    make: "",
    model: "",
    yearFrom: 0,
    yearTo: 0,
    side: "",
    condition: "חדש",
    description: row.description || "",
    vehicleFitment: row.vehicleFitment || "",
    image: row.image,
    inStock: row.inStock ?? true,
    subcategory: row.sub,
    adminCreated: true,
  };
}
export function createdHits(rows: Record<string, ProductOverride>): SearchHit[] {
  return Object.entries(rows).flatMap(([sku, row]) =>
    row.created && row.name && row.category
      ? [
          {
            sku,
            title: row.name,
            titleOriginal: [row.brand, row.description, row.vehicleFitment]
              .filter(Boolean)
              .join(" "),
            category: row.category,
            oe: "",
          },
        ]
      : [],
  );
}
