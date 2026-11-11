/** Display-only part-type chips. Rules are derived from live product names; catalog source data is unchanged. */
import { displayCategory, displayOverride, normalizeDisplayCategory } from "./display-taxonomy.ts";
import type { ListingSearch, SearchHit } from "./catalog-types.ts";

export type PartTypeDef = {
  id: string;
  label: string;
  /** Tested against the display title (and original title). */
  pattern: RegExp;
};

type CategoryTypes = { types: PartTypeDef[] };

/**
 * Types observed in actual catalog names (and existing taxonomy subs).
 * Categories with a single part type are omitted — no chip row.
 */
const BY_CATEGORY: Record<string, CategoryTypes> = {
  filters: {
    types: [
      { id: "cabin", label: "פילטר מזגן", pattern: /פילטר\s*מזגן|מסנן\s*מזגן|מ\.?\s*מזגן|פ\.?\s*מזגן|פולן/ },
      { id: "air", label: "פילטר אוויר", pattern: /פילטר\s*אוויר|פילטר\s*אויר|מסנן\s*אוויר|מסנן\s*אויר/ },
      { id: "oil", label: "פילטר שמן", pattern: /פילטר\s*שמן|מסנן\s*שמן|פ\.?\s*שמן/ },
      { id: "diesel", label: "פילטר סולר-דלק", pattern: /פילטר\s*סולר|מסנן\s*סולר|פילטר\s*דלק|מסנן\s*דלק/ },
      { id: "gear", label: "פילטר גיר", pattern: /פילטר\s*גיר|מסנן\s*גיר/ },
    ],
  },
  brakes: {
    types: [
      { id: "pads", label: "רפידות", pattern: /רפידות|רפיד/ },
      { id: "discs", label: "צלחות", pattern: /צלחת\s*בלם|צלחות|דיסק\s*בלם/ },
      { id: "shoes", label: "נעליים", pattern: /נעל\s*בלם|נעלי\s*בלם|נעליים/ },
    ],
  },
  steering: {
    types: [
      { id: "ends", label: "קצוות הגה", pattern: /קצה\s*הגה|ק\.?\s*הגה/ },
      { id: "links", label: "מוטות קישור", pattern: /מוט\s*קישור|מ\.?\s*קישור/ },
      { id: "pumps", label: "משאבות הגה", pattern: /משאבת\s*הגה/ },
      { id: "boots", label: "גומיות הגה", pattern: /גומי(?:ית|ות)?\s*הגה/ },
    ],
  },
  suspension: {
    types: [
      { id: "joints", label: "תפוחי פרונט", pattern: /תפוח\s*פרונט|ת\.?\s*פרונט/ },
      { id: "arms", label: "זרועות", pattern: /זרוע|ז\.?\s*פרונט|משולש/ },
      { id: "mounts", label: "תושבות בולם", pattern: /תושבת\s*בולם|ת\.?\s*בולם/ },
      { id: "bushings", label: "גומיות מייצב", pattern: /גומי\s*מייצב/ },
    ],
  },
  clutch: {
    types: [
      { id: "kits", label: "ערכות מצמד", pattern: /סט\s*מצמד|ס\.?\s*מצמד|ערכ/ },
      { id: "pumps", label: "משאבות מצמד", pattern: /משאבת\s*מצמד|מ\.?\s*מצמד/ },
    ],
  },
  "spark-plugs": {
    types: [
      { id: "glow", label: "מצתי להט", pattern: /להט/ },
      { id: "ignition", label: "מצתי הצתה", pattern: /מצת/ },
    ],
  },
  fluids: {
    types: [
      { id: "engine", label: "שמן מנוע", pattern: /שמן\s*מנוע|engine\s*oil/i },
      { id: "gear", label: "שמן גיר", pattern: /שמן\s*גיר|ש\.?\s*גיר|\bATF\b|\bCVT\b|\bDCT\b/ },
      { id: "brake-fluid", label: "נוזל בלמים", pattern: /נוזל\s*בלמ|brake\s*fluid|DOT\s*[345]/i },
      { id: "coolant", label: "נוזל קירור", pattern: /נוזל\s*קירור|antifreeze|coolant|אנטיראסט/i },
    ],
  },
  "workshop-packs": {
    types: [
      { id: "engine", label: "שמן מנוע בכמות", pattern: /שמן\s*מנוע/ },
      { id: "gear", label: "שמן גיר בכמות", pattern: /שמן\s*גיר|שמן\s*סרן|ש\.?\s*גיר|\bATF\b|\bCVT/ },
      { id: "ties", label: "אזיקונים", pattern: /אזיקון/ },
    ],
  },
  timing: {
    types: [
      { id: "belt", label: "סט טיימינג", pattern: /טימינג|טיימינג/ },
      { id: "chain", label: "סט שרשרת", pattern: /שרשרת/ },
    ],
  },
  lighting: {
    types: [
      { id: "bulbs", label: "נורות", pattern: /נור(?:ה|ת|ות|ית)|סט\s*נורות/ },
      { id: "lamps", label: "פנסים", pattern: /פנס|מהבהב|mega-?flare/i },
      { id: "lamp-parts", label: "חלקי פנס", pattern: /מסגרת|רפלקטור|כיסוי|כסוי|זכוכית|בורג\s*כוון|ברגים\s*כוון/ },
    ],
  },
  radiator: {
    types: [
      { id: "aux", label: "רדיאטור עזר", pattern: /רדיאטור\s*עזר/ },
      { id: "main", label: "רדיאטור", pattern: /רדיאטור/ },
    ],
  },
  "cleaning-maintenance": {
    types: [
      { id: "grease", label: "גריז", pattern: /גריז/ },
      { id: "spray", label: "תרסיסים", pattern: /תרסיס/ },
      { id: "paste", label: "משחות", pattern: /משחה|משחת/ },
      { id: "towel", label: "מגבות", pattern: /מגבת/ },
    ],
  },
};

const ALL_IDS = new Set(Object.values(BY_CATEGORY).flatMap((c) => c.types.map((t) => t.id)));

/** High-level leftover ?type= values (PartTypeId) — not chip ids. */
const LEGACY_PART_TYPE_IDS = new Set([
  "headlight",
  "foglight",
  "compressor",
  "condenser",
  "cabin-filter",
  "oil-filter",
  "filter",
  "brake",
  "sensor",
  "spark-plug",
  "small-engine",
  "fluid",
  "ignition-coil",
  "additive",
  "general",
  "radiator",
  "shock",
]);

export function typesForCategory(category?: string): PartTypeDef[] {
  const id = normalizeDisplayCategory(category);
  if (!id) return [];
  return BY_CATEGORY[id]?.types || [];
}

export function isPartTypeChip(id?: string): boolean {
  return Boolean(id && ALL_IDS.has(id) && !LEGACY_PART_TYPE_IDS.has(id));
}

export function selectedPartType(state: { type?: string; sub?: string; fluidKind?: string }): string | undefined {
  if (isPartTypeChip(state.type)) return state.type;
  if (isPartTypeChip(state.sub)) return state.sub;
  if (isPartTypeChip(state.fluidKind)) return state.fluidKind;
  return undefined;
}

function textOf(hit: { title?: string; titleOriginal?: string; name?: string; nameOriginal?: string }) {
  return `${hit.title || ""} ${hit.titleOriginal || ""} ${hit.name || ""} ${hit.nameOriginal || ""}`;
}

export function classifyPartType(
  hit: {
    sku?: string;
    category?: string;
    title?: string;
    titleOriginal?: string;
    name?: string;
    nameOriginal?: string;
  },
  categoryHint?: string,
): string | undefined {
  const fallback = hit.category || categoryHint || "";
  const category = normalizeDisplayCategory(displayCategory(hit.sku || "", fallback) || fallback);
  const types = typesForCategory(category);
  if (!types.length) return undefined;
  const sub = hit.sku ? displayOverride(hit.sku)?.sub : undefined;
  if (sub && types.some((t) => t.id === sub)) return sub;
  const text = textOf(hit);
  for (const type of types) {
    if (type.pattern.test(text)) return type.id;
  }
  return undefined;
}

export function partTypeLabel(category: string | undefined, id: string): string {
  return typesForCategory(category).find((t) => t.id === id)?.label || id;
}

export function hasPartTypeChips(category?: string): boolean {
  return typesForCategory(category).length >= 2;
}

/** Search state for counting a chip, keeping vehicle / query / category. */
export function stateForPartType(state: ListingSearch, typeId: string | undefined): ListingSearch {
  const next: ListingSearch = { ...state, page: undefined };
  if (!typeId) {
    next.type = undefined;
    next.sub = undefined;
    if (state.category === "fluids") next.fluidKind = undefined;
    return next;
  }
  next.type = typeId;
  next.sub = typeId === "brake-fluid" || typeId === "coolant" || typeId === "boots" || typeId === "belt" || typeId === "chain" || typeId === "bulbs" || typeId === "lamps" || typeId === "lamp-parts" || typeId === "aux" || typeId === "main" || typeId === "grease" || typeId === "spray" || typeId === "paste" || typeId === "towel" ? undefined : typeId;
  if (state.category === "fluids") {
    next.fluidKind = typeId === "engine" || typeId === "gear" ? typeId : typeId === "brake-fluid" ? "brake" : undefined;
    if (typeId !== "engine" && typeId !== "gear") next.sub = undefined;
  }
  return next;
}

export function chipSearch(state: ListingSearch, typeId: string | undefined): ListingSearch {
  return stateForPartType(state, typeId);
}

export type PartTypeChip = { id: string; label: string; count: number; active: boolean; search: ListingSearch };

export function buildPartTypeChips(
  state: ListingSearch,
  category: string | undefined,
  hits: SearchHit[],
  hitMatches: (hit: SearchHit, state: ListingSearch) => boolean,
): PartTypeChip[] {
  const types = typesForCategory(category);
  if (types.length < 2) return [];
  const base = stateForPartType(state, undefined);
  const selected = selectedPartType(state);
  const chips: PartTypeChip[] = [];
  for (const type of types) {
    const search = chipSearch(state, type.id);
    const count = hits.filter((hit) => hitMatches(hit, search)).length;
    if (!count && selected !== type.id) continue;
    chips.push({
      id: type.id,
      label: type.label,
      count,
      active: selected === type.id,
      search,
    });
  }
  if (chips.length < 2 && !selected) return [];
  return chips;
}

export function partTypeCategories() {
  return Object.keys(BY_CATEGORY);
}
