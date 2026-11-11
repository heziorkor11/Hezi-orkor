import { visibleCategories, type ListingSearch, type SearchHit } from "@/lib/catalog-types";
import { isHiddenProduct, subcategories } from "@/lib/display-taxonomy";
import { hasPartTypeChips } from "./part-types.ts";
import { classifyFluidKind } from "@/lib/fluid-classify";
import { hasRealProductImage } from "@/lib/product-image-policy";
import { AXLE_LABELS, parseViscosity } from "@/lib/tile-facets";

export type TileFamily = "sub" | "viscosity" | "axle" | "hand" | "category";

export type TileFacet = {
  category?: string;
  sub?: string;
  fluidKind?: string;
  viscosity?: string;
  axle?: string;
  hand?: string;
};

export type CategoryTile = {
  id: string;
  label: string;
  count: number;
  image: string;
  search: ListingSearch;
  active: boolean;
  family: TileFamily;
};

type TileDef = {
  id: string;
  label: string;
  family: TileFamily;
  facet: TileFacet;
  /** Prefer this SKU's photo when it belongs to the group and has a real image. */
  preferSku?: string;
};

type ImageFn = (sku: string, oe?: string) => string | undefined;
type MatchFn = (hit: SearchHit, state: ListingSearch) => boolean;

/** Preferred catalog photos used in the approved mockups, when they still belong to the group. */
const PREFERRED: Record<string, string> = {
  "viscosity:5W-30": "HZ-OIL-00107",
  "viscosity:5W-40": "HZ-OIL-00126",
  "viscosity:0W-20": "HZ-OIL-00051",
  "viscosity:10W-40": "HZ-OIL-00228",
  "viscosity:15W-40": "HZ-OIL-00229",
  "viscosity:0W-30": "HZ-OIL-00057",
  "viscosity:10W-30": "HZ-OIL-00063",
  "viscosity:5W-20": "HZ-OIL-00102",
  "viscosity:0W-40": "HZ-OIL-00058",
  "viscosity:0W-16": "HZ-OIL-00049",
  "brakes:pads": "HZ-BRK-01316",
  "brakes:discs": "HZ-BRK-00002",
  "brakes:axle:front": "HZ-BRK-00001",
  "brakes:axle:rear": "HZ-BRK-00003",
  "filters:oil": "HZ-OILF-00002",
  "filters:air": "HZ-FLT-00002",
  "filters:cabin": "HZ-CAF-00001",
  "filters:diesel": "HZ-FLT-00557",
  "filters:gear": "HZ-GEN-04974",
  "steering:ends": "HZ-GEN-00380",
  "steering:links": "HZ-GEN-02447",
  "steering:pumps": "HZ-GEN-05053",
  "steering:hand:right": "HZ-GEN-00375",
  "steering:hand:left": "HZ-GEN-00374",
};

const GRADE_ORDER = [
  "0W-8",
  "0W-12",
  "0W-16",
  "0W-20",
  "0W-30",
  "0W-40",
  "5W-20",
  "5W-30",
  "5W-40",
  "5W-50",
  "10W-30",
  "10W-40",
  "10W-50",
  "10W-60",
  "15W-40",
  "15W-50",
  "20W-50",
  "20W-60",
];

const SUB_ORDER: Record<string, string[]> = {
  filters: ["oil", "air", "cabin", "diesel", "gear"],
  brakes: ["pads", "discs", "shoes"],
};

function subDefs(category: string): TileDef[] {
  const order = SUB_ORDER[category] || [];
  const listed = (subcategories[category] || []).filter((s) => s.count > 0);
  listed.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return listed.map((s) => ({
      id: `${category}:${s.id}`,
      label: category === "filters" ? `פילטר ${s.name}` : s.name,
      family: "sub" as const,
      facet: { sub: s.id },
      preferSku: PREFERRED[`${category}:${s.id}`],
    }));
}

function viscosityDefs(hits: SearchHit[], labelPrefix: string): TileDef[] {
  const counts = new Map<string, number>();
  for (const hit of hits) {
    if (classifyFluidKind(hit.title) !== "engine") continue;
    const grade = parseViscosity(hit.title);
    if (!grade) continue;
    counts.set(grade, (counts.get(grade) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const ia = GRADE_ORDER.indexOf(a[0]);
      const ib = GRADE_ORDER.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map(([grade]) => ({
      id: `viscosity:${grade}`,
      label: `${labelPrefix}\n${grade}`,
      family: "viscosity" as const,
      facet: { viscosity: grade, fluidKind: "engine" },
      preferSku: PREFERRED[`viscosity:${grade}`],
    }));
}

function defsFor(state: ListingSearch, hitsInCategory: SearchHit[]): TileDef[] {
  const category = state.category;
  if (!category) {
    return visibleCategories.map((c) => ({
      id: `category:${c.id}`,
      label: c.name,
      family: "category" as const,
      facet: { category: c.id },
    }));
  }
  if (category === "fluids") {
    return viscosityDefs(hitsInCategory, "שמני מנוע");
  }
  if (category === "workshop-packs") {
    // Type chips cover pack kinds; viscosity tiles stay when viewing engine oils.
    if (state.sub === "engine" || state.type === "engine") {
      return viscosityDefs(hitsInCategory, "שמני מנוע");
    }
    return [];
  }
  if (category === "brakes") {
    return [
      {
        id: "brakes:axle:front",
        label: AXLE_LABELS.front,
        family: "axle",
        facet: { axle: "front" },
        preferSku: PREFERRED["brakes:axle:front"],
      },
      {
        id: "brakes:axle:rear",
        label: AXLE_LABELS.rear,
        family: "axle",
        facet: { axle: "rear" },
        preferSku: PREFERRED["brakes:axle:rear"],
      },
    ];
  }
  if (category === "steering") {
    return [
      {
        id: "steering:hand:right",
        label: "קצה הגה ימין",
        family: "hand",
        facet: { sub: "ends", hand: "right" },
        preferSku: PREFERRED["steering:hand:right"],
      },
      {
        id: "steering:hand:left",
        label: "קצה הגה שמאל",
        family: "hand",
        facet: { sub: "ends", hand: "left" },
        preferSku: PREFERRED["steering:hand:left"],
      },
    ];
  }
  if (category === "driveshaft") {
    return [
      {
        id: "driveshaft:hand:right",
        label: "ציריה ימין",
        family: "hand",
        facet: { hand: "right" },
      },
      {
        id: "driveshaft:hand:left",
        label: "ציריה שמאל",
        family: "hand",
        facet: { hand: "left" },
      },
    ];
  }
  if (category === "hub") {
    return [
      {
        id: "hub:axle:front",
        label: AXLE_LABELS.front,
        family: "axle",
        facet: { axle: "front" },
      },
      {
        id: "hub:axle:rear",
        label: AXLE_LABELS.rear,
        family: "axle",
        facet: { axle: "rear" },
      },
    ];
  }
  // Part-type chips replace photo tiles for the type/sub family.
  if (hasPartTypeChips(category)) {
    return [];
  }
  if (subcategories[category]?.some((s) => s.count > 0)) {
    return subDefs(category);
  }
  return [];
}

function clearFamily(state: ListingSearch, family: TileFamily): ListingSearch {
  const next = { ...state, page: undefined };
  if (family === "sub") {
    next.sub = undefined;
    next.hand = undefined;
  } else if (family === "viscosity") {
    next.viscosity = undefined;
  } else if (family === "axle") {
    next.axle = undefined;
  } else if (family === "hand") {
    next.hand = undefined;
    // Hand tiles for steering also pin sub=ends; leave sub so "all ends" stays unless this was a hand tile toggle.
  } else if (family === "category") {
    next.category = undefined;
    next.sub = undefined;
    next.fluidKind = undefined;
    next.viscosity = undefined;
    next.axle = undefined;
    next.hand = undefined;
    next.oilBrand = undefined;
  }
  return next;
}

function applyFacet(state: ListingSearch, def: TileDef): ListingSearch {
  const next = clearFamily(state, def.family);
  return { ...next, ...def.facet, page: undefined };
}

function isActive(state: ListingSearch, def: TileDef): boolean {
  const keysMatch = (Object.entries(def.facet) as [keyof TileFacet, string][]).every(
    ([key, value]) => state[key] === value,
  );
  if (!keysMatch) return false;
  // A more specific tile (side/axle) wins over the plain sub tile.
  if (def.family === "sub" && state.hand && !def.facet.hand) return false;
  if (def.family === "sub" && state.axle && !def.facet.axle) return false;
  return true;
}

function pickImage(members: SearchHit[], preferSku: string | undefined, imageOf: ImageFn): string | undefined {
  const preferred = preferSku ? members.find((h) => h.sku === preferSku) : undefined;
  if (preferred) {
    const src = imageOf(preferred.sku, preferred.oe);
    if (hasRealProductImage(src) && src) return src;
  }
  for (const hit of members) {
    const src = imageOf(hit.sku, hit.oe);
    if (hasRealProductImage(src) && src) return src;
  }
  return undefined;
}

/**
 * Build the photo-tile row for a results view. Groups with 0 products or no
 * real catalog photo are omitted. A row of fewer than 2 tiles is dropped.
 */
export function buildCategoryTiles(
  state: ListingSearch,
  hits: SearchHit[],
  opts: { imageOf: ImageFn; hitMatches: MatchFn },
): CategoryTile[] {
  const visible = hits.filter((hit) => !isHiddenProduct(hit.sku));
  const baseState: ListingSearch = {
    ...state,
    sub: undefined,
    viscosity: undefined,
    axle: undefined,
    hand: undefined,
    page: undefined,
  };
  // Keep fluidKind/oilBrand/make/model/year/q/category so vehicle & oil-brand context stays.
  // Viscosity tiles on fluids need the engine-oil pool even if a grade is already selected.
  const categoryHits = visible.filter((hit) => opts.hitMatches(hit, baseState));
  const defs = defsFor(state, categoryHits);
  const tiles: CategoryTile[] = [];
  for (const def of defs) {
    const countState: ListingSearch = { ...baseState, ...def.facet };
    const used = visible.filter((hit) => opts.hitMatches(hit, countState));
    const image = pickImage(used, def.preferSku, opts.imageOf);
    if (!used.length || !image) continue;
    const active = isActive(state, def);
    const search = active ? clearFamily(state, def.family) : applyFacet(state, def);
    tiles.push({
      id: def.id,
      label: def.label,
      count: used.length,
      image,
      search,
      active,
      family: def.family,
    });
  }
  return tiles.length >= 2 ? tiles : [];
}
