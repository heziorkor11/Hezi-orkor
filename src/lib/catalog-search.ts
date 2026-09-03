import { sameModel } from "@/lib/model-names";
import {
  PAGE_SIZE,
  type ListingCard,
  type ListingResult,
  type ListingSearch,
  type Product,
  type ProductFilter,
  type SearchHit,
  typeFromCategory,
} from "@/lib/catalog-types";
import {
  loadFacets,
  loadManifest,
  loadPage,
  unique,
} from "@/lib/catalog-runtime";

// Search + listing live here so catalog-runtime stays small.
// loadChunk / loadSkuMap / cardToProduct are reached through runtime listing helpers
// that we re-implement locally using public runtime loaders where possible.

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksLikePartNumber(q: string) {
  const compact = q.replace(/[\s-]/g, "");
  return /\d/.test(compact) && compact.length >= 5;
}

/** Whole-token match so "Q5" does not hit OE 56820Q5000. */
function tokenHit(hay: string, needle: string) {
  const h = hay.trim();
  const n = needle.trim();
  if (!h || !n) return false;
  if (h === n) return true;
  try {
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeReg(n)}([^\\p{L}\\p{N}]|$)`, "iu").test(h);
  } catch {
    return h.includes(` ${n} `) || h.startsWith(`${n} `) || h.endsWith(` ${n}`);
  }
}

function queryMatchesHit(hit: SearchHit, raw: string) {
  const q = raw.trim();
  if (!q) return true;
  const s = q.toLowerCase();
  const title = hit.title || "";
  const make = hit.make || "";
  const model = hit.model || "";
  const sku = (hit.sku || "").toLowerCase();
  const oeTokens = (hit.oe || "")
    .split(/[\s,;|/]+/)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
  if (looksLikePartNumber(s)) {
    if (sku === s || sku.startsWith(s) || s.startsWith(sku)) return true;
    if (oeTokens.some((t) => t === s || t.startsWith(s) || s.startsWith(t))) return true;
    return tokenHit(title, q) || title.toLowerCase().includes(s);
  }
  if (tokenHit(title, q) || tokenHit(make, q) || tokenHit(model, q)) return true;
  if (s.length >= 3 && title.toLowerCase().includes(s)) return true;
  if (s.length >= 4 && (sku === s || sku.startsWith(s))) return true;
  return false;
}

function filterHit(hit: SearchHit, state: ProductFilter) {
  if (state.category && hit.category !== state.category) return false;
  if (state.make && hit.make !== state.make) return false;
  if (state.model && !sameModel(state.make || hit.make || "", hit.model, state.model)) return false;
  if (state.year) {
    const y = Number(String(state.year).replace(/["']/g, ""));
    if (hit.yearFrom && Number.isFinite(y) && (y < hit.yearFrom || y > (hit.yearTo || hit.yearFrom))) return false;
  }
  if (state.type) {
    if (typeFromCategory(hit.category) !== state.type && hit.category !== state.type) return false;
  }
  if (state.q && !queryMatchesHit(hit, state.q)) return false;
  return true;
}

export async function loadSearchIndex(): Promise<SearchHit[]> {
  const { loadSearchIndex: load } = await import("./catalog-runtime-search");
  return load();
}
