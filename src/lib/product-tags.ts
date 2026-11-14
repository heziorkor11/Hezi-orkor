import tagLibraryFile from "../../public/catalog/tag-library.json" with { type: "json" };
import productTagsFile from "../../public/catalog/product-tags.json" with { type: "json" };
import type { TagDef } from "@/lib/admin/types";
import { overlayProductTags, overlayTagLibrary } from "@/lib/admin/public-overlay";

const bundledLibrary = (tagLibraryFile as { tags?: TagDef[] }).tags || [];
const bundledBySku = ((productTagsFile as { bySku?: Record<string, string[]> }).bySku || {}) as Record<
  string,
  string[]
>;

export function getTagLibrary(): TagDef[] {
  return overlayTagLibrary(bundledLibrary);
}

export function getTag(id: string): TagDef | undefined {
  return getTagLibrary().find((t) => t.id === id);
}

/** At most two tags, in display order: [top-right, top-left]. */
export function getProductTags(sku: string): TagDef[] {
  const ids = overlayProductTags(sku, bundledBySku[sku] || []).slice(0, 2);
  return ids.map((id) => getTag(id)).filter((t): t is TagDef => Boolean(t));
}
