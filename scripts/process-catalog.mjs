#!/usr/bin/env node
/**
 * Build the public Hezi catalog JSON from sheet לאתר only.
 * Never writes price / cost / supplier fields.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPublicCatalogRows } from "./latar-xlsx.mjs";
import {
  NORMALIZE_CATEGORIES,
  parseFitments,
  parseMakeModelLegacy,
  parseYearsIn,
  isSmallEngineText,
} from "./fitment-normalize.mjs";
import { expandProductName } from "./name-expand.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "catalog");
const CATEGORY_OVERRIDES_PATH = join(OUT, "category-overrides.json");
/** @type {Record<string, {category:string, categoryName:string}>} */
const categoryOverridesBySku = (() => {
  try {
    if (!existsSync(CATEGORY_OVERRIDES_PATH)) return {};
    const raw = JSON.parse(readFileSync(CATEGORY_OVERRIDES_PATH, "utf8"));
    return raw?.bySku && typeof raw.bySku === "object" ? raw.bySku : {};
  } catch {
    return {};
  }
})();

const PAGE_SIZE = 60;
const CHUNK_SIZE = 200;
const FEATURED_COUNT = 8;

const CATEGORY_SLUGS = {
  כללי: "general",
  "פנס ראשי": "lights",
  בלמים: "brakes",
  "מדחס מזגן": "ac-compressor",
  פילטרים: "filters",
  "מעבה מזגן": "ac-condenser",
  מצתים: "spark-plugs",
  "שמנים ונוזלים": "fluids",
  "מסנן שמן": "oil-filter",
  "פילטר מזגן": "cabin-filter",
  "תאורה ונורות": "lighting",
  "סליל הצתה": "ignition-coils",
  "חיישן חמצן": "sensors",
  תוספים: "additives",
  "מנועים קטנים": "small-engine",
  "משאבת דלק": "fuel-pump",
  "בולם זעזועים": "shocks",
  היגוי: "steering",
  מתלים: "suspension",
  מצמד: "clutch",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_SLUGS);


function slugifyCategory(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "general";
  if (CATEGORY_SLUGS[trimmed]) return CATEGORY_SLUGS[trimmed];
  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "general";
}

function pad(n, width) {
  return String(n).padStart(width, "0");
}

function parseYears(fit) {
  return parseYearsIn(fit);
}

function parseSide(fit) {
  const text = String(fit || "");
  if (/ימין/.test(text) && /שמאל/.test(text)) return "";
  if (/ימין/.test(text)) return "ימין";
  if (/שמאל/.test(text)) return "שמאל";
  if (/קדמי/.test(text)) return "קדמי";
  if (/אחורי/.test(text)) return "אחורי";
  return "";
}

function parseMakeModel(fit, name) {
  return parseMakeModelLegacy(fit, name);
}

function defaultDescription(name, sku, fitment) {
  const fit = String(fitment || "").trim();
  if (fit) return `${name}. התאמה: ${fit}. מק״ט ${sku}.`;
  return `${name}. יש לאשר התאמה לפי מק״ט / OE / מספר רכב. מק״ט ${sku}.`;
}

function listProductImages() {
  const dir = join(ROOT, "public", "products");
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir)) {
    const ext = extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) continue;
    map.set(file.slice(0, -ext.length).toLowerCase(), file);
  }
  return map;
}

function matchImage(sku, oe, images) {
  const skuKey = String(sku || "").trim().toLowerCase();
  if (skuKey && images.has(skuKey)) return `/products/${images.get(skuKey)}`;
  const tokens = String(oe || "")
    .split(/[\s,;/|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const tok of tokens) {
    const key = tok.toLowerCase();
    if (images.has(key)) return `/products/${images.get(key)}`;
  }
  return undefined;
}

function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data), { encoding: "utf8" });
}

function resetDir(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

const FORBIDDEN_KEYS = /^(price|originalprice|cost|supplier|מחיר|עלות)$/i;

function assertNoPrice(record, where) {
  for (const key of Object.keys(record)) {
    if (FORBIDDEN_KEYS.test(key) && record[key] != null && record[key] !== "") {
      throw new Error(`Refusing to write ${key} on ${where}`);
    }
  }
}

const images = listProductImages();
const { sheetName, rows, dataRowCount, xlsxPath } = await readPublicCatalogRows();

if (rows.length !== dataRowCount) {
  console.warn(
    `Skipped ${dataRowCount - rows.length} non-empty rows missing מק״ט or שם מוצר`,
  );
}

const needsReviewRows = [];

const products = rows.map((row) => {
  let categoryName = row.category || "כללי";
  let category = slugifyCategory(categoryName);

  // Explicit SKU overrides (category-overrides.json).
  const ov = categoryOverridesBySku[row.sku];
  if (ov?.category && ov?.categoryName) {
    category = ov.category;
    categoryName = ov.categoryName;
  } else {
    // High-confidence name rules (never invent; careful with fuel filters).
    const name = String(row.name || "");
    const isFuelFilter = /(מסנן|פילטר).{0,12}(מ\.?דלק|דלק)|(מ\.?דלק|דלק).{0,12}(מסנן|פילטר)/.test(name);
    if ((/\bמ\.דלק\b/.test(name) || name.startsWith("מ.דלק") || name.includes("משאבת דלק")) && !isFuelFilter) {
      categoryName = "משאבת דלק";
      category = "fuel-pump";
    } else if (/מדחס/.test(name) && category === "lights") {
      categoryName = "מדחס מזגן";
      category = "ac-compressor";
    } else if (/גומי מייצב/.test(name) || /^בולם\b/.test(name)) {
      categoryName = "בולם זעזועים";
      category = "shocks";
    } else if (/^רפיד/.test(name) || name.includes("רפידות בלם")) {
      categoryName = "בלמים";
      category = "brakes";
    } else if (/^מעבה\b/.test(name)) {
      categoryName = "מעבה מזגן";
      category = "ac-condenser";
    } else if (/^סליל(י)? הצתה/.test(name)) {
      categoryName = "סליל הצתה";
      category = "ignition-coils";
    } else if (/^מצת/.test(name) && category !== "small-engine") {
      categoryName = "מצתים";
      category = "spark-plugs";
    } else if (/חיישן חמצן/.test(name)) {
      categoryName = "חיישן חמצן";
      category = "sensors";
    } else if (/^(פילטר|מסנן) שמן/.test(name)) {
      categoryName = "מסנן שמן";
      category = "oil-filter";
    } else if (/^(פילטר|מסנן) מזגן/.test(name)) {
      categoryName = "פילטר מזגן";
      category = "cabin-filter";
    } else if (/^נור(ה|ת|ות|ית)\b/.test(name) && category === "lights") {
      categoryName = "תאורה ונורות";
      category = "lighting";
    } else if (
      category === "lights" &&
      !/פנס|מדחס|^(ראשי|נס ראשי|סט ראשי)\b/.test(name) &&
      /(זכוכית|רפלקטור|בורג כוון|ברגים כוון|מסגרת לראשי|כסוי|כיסוי)/.test(name)
    ) {
      categoryName = "תאורה ונורות";
      category = "lighting";
    } else if (
      /משאבת מצמד|מ\.מצמד|סט מצמד|ס\.מצמד|גלגל תנופה|ג\.תנופה/.test(name)
    ) {
      categoryName = "מצמד";
      category = "clutch";
    } else if (
      /קצה הגה|ק\.הגה|מוט קישור|מ\.קישור/.test(name) ||
      name.startsWith("משאבת הגה") ||
      name.includes("משאבת הגה")
    ) {
      categoryName = "היגוי";
      category = "steering";
    } else if (
      !/^בולם\b/.test(name) &&
      /תפוח פרונט|ת\.פרונט|גומי מייצב|זרוע קדמית|ז\.פרונט|תושבת בולם|ת\.בולם/.test(name)
    ) {
      categoryName = "מתלים";
      category = "suspension";
    }
  }

  const side = parseSide(row.vehicleFitment);
  const image = matchImage(row.sku, row.oe, images);

  // Catalog-wide multi-fitment normalize (shared table). Small-engine reclass only from plugs.
  const isPlug = category === "spark-plugs";

  let make = "";
  let model = "";
  let yearFrom = 0;
  let yearTo = 0;
  /** @type {{make:string,model:string,yearFrom:number,yearTo:number}[]|undefined} */
  let fitments;

  {
    const parsed = parseFitments(row.vehicleFitment, row.name, { enabled: true });
    if (parsed.smallEngine && isPlug) {
      // Lawn mower / ATV / small-engine plugs → own category, excluded from vehicle finder.
      categoryName = "מנועים קטנים";
      category = "small-engine";
      fitments = [];
    } else if (parsed.smallEngine && !isPlug) {
      // Non-plug small-engine text: leave make empty, do not invent vehicle fitment.
      fitments = [];
      if (true) {
        needsReviewRows.push({
          sku: row.sku,
          name: row.name,
          reasons: ["small-engine-non-plug"],
          vehicleFitment: String(row.vehicleFitment || "").slice(0, 240),
        });
      }
    } else {
      fitments = parsed.fitments.filter((f) => f.make);
      if (fitments.length) {
        const primary = fitments.find((f) => f.model) || fitments[0];
        make = primary.make;
        model = primary.model || "";
        yearFrom = primary.yearFrom || 0;
        yearTo = primary.yearTo || primary.yearFrom || 0;
      } else {
        const legacyYears = parseYears(row.vehicleFitment);
        yearFrom = legacyYears.yearFrom;
        yearTo = legacyYears.yearTo;
      }
      if (parsed.needsReview.length) {
        needsReviewRows.push({
          sku: row.sku,
          name: row.name,
          reasons: parsed.needsReview,
          category,
          vehicleFitment: String(row.vehicleFitment || "").slice(0, 240),
        });
      }
    }
  }

  const expanded = expandProductName(row.name);
  const displayName = expanded.name;
  const descriptionExpanded = row.description
    ? expandProductName(row.description).name
    : defaultDescription(displayName, row.sku, row.vehicleFitment);

  const record = compact({
    id: row.sku,
    sku: row.sku,
    name: displayName,
    nameOriginal: expanded.nameOriginal,
    category,
    categoryName,
    vehicleFitment: row.vehicleFitment,
    make,
    model,
    yearFrom,
    yearTo,
    side,
    image,
    oe: row.oe,
    description: descriptionExpanded,
    condition: "חלק חדש",
    fitments: fitments && fitments.length ? fitments : undefined,
  });
  assertNoPrice(record, row.sku);
  return record;
});

const catRank = (name) => {
  const i = CATEGORY_ORDER.indexOf(name);
  return i === -1 ? CATEGORY_ORDER.length : i;
};

products.sort((a, b) => {
  const cr = catRank(a.categoryName) - catRank(b.categoryName);
  if (cr) return cr;
  const cn = a.categoryName.localeCompare(b.categoryName, "he");
  if (cn) return cn;
  return a.sku.localeCompare(b.sku, "en");
});

const categoryStats = [];
const catSeen = new Map();
for (const [index, p] of products.entries()) {
  let entry = catSeen.get(p.category);
  if (!entry) {
    entry = { id: p.category, name: p.categoryName, count: 0, offset: index };
    catSeen.set(p.category, entry);
    categoryStats.push(entry);
  }
  entry.count += 1;
}

// Preserve images/ and images-*.json; only refresh generated JSON shards.
mkdirSync(OUT, { recursive: true });
resetDir(join(OUT, "pages"));
resetDir(join(OUT, "chunks"));
mkdirSync(join(OUT, "pages"), { recursive: true });
mkdirSync(join(OUT, "chunks"), { recursive: true });

const skuMap = {};
const chunkCount = Math.ceil(products.length / CHUNK_SIZE);
for (let i = 0; i < chunkCount; i += 1) {
  const id = pad(i, 2);
  const slice = products.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).map((p) => {
    const { categoryName: _cn, ...rest } = p;
    const full = compact({
      id: rest.id,
      sku: rest.sku,
      name: rest.name,
      nameOriginal: rest.nameOriginal,
      category: rest.category,
      vehicleFitment: rest.vehicleFitment || "",
      make: rest.make || "",
      model: rest.model || "",
      yearFrom: rest.yearFrom || 0,
      yearTo: rest.yearTo || 0,
      side: rest.side || "",
      image: rest.image,
      oe: rest.oe || "",
      description: rest.description,
      condition: rest.condition,
      fitments: rest.fitments,
    });
    assertNoPrice(full, `chunk ${id} ${full.sku}`);
    skuMap[full.sku] = id;
    return full;
  });
  writeJson(join(OUT, "chunks", `${id}.json`), slice);
}

const pageCount = Math.ceil(products.length / PAGE_SIZE);
for (let i = 0; i < pageCount; i += 1) {
  const n = i + 1;
  const slice = products.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE).map((p) => {
    const card = compact({
      id: p.id,
      sku: p.sku,
      name: p.name,
      nameOriginal: p.nameOriginal,
      category: p.category,
      vehicleFitment: p.vehicleFitment || "",
      make: p.make || "",
      model: p.model || "",
      yearFrom: p.yearFrom || 0,
      yearTo: p.yearTo || 0,
      side: p.side || "",
      image: p.image,
      oe: p.oe || "",
      fitments: p.fitments,
    });
    assertNoPrice(card, `page ${n} ${card.sku}`);
    return card;
  });
  writeJson(join(OUT, "pages", `${pad(n, 4)}.json`), slice);
}

const searchIndex = products.map((p) =>
  compact({
    sku: p.sku,
    title: p.name,
    titleOriginal: p.nameOriginal,
    category: p.category,
    oe: p.oe || "",
    make: p.make || undefined,
    model: p.model || undefined,
    yearFrom: p.yearFrom || undefined,
    yearTo: p.yearTo || undefined,
    fitments: p.fitments,
  }),
);
writeJson(join(OUT, "search-index.json"), searchIndex);
writeJson(join(OUT, "sku-map.json"), skuMap);

const withImage = products.filter((p) => p.image);
const featured = (withImage.length >= FEATURED_COUNT ? withImage : [...withImage, ...products])
  .filter((p, i, arr) => arr.findIndex((x) => x.sku === p.sku) === i)
  .slice(0, FEATURED_COUNT)
  .map((p) =>
    compact({
      id: p.id,
      sku: p.sku,
      name: p.name,
      nameOriginal: p.nameOriginal,
      category: p.category,
      vehicleFitment: p.vehicleFitment || "",
      make: p.make || "",
      model: p.model || "",
      yearFrom: p.yearFrom || 0,
      yearTo: p.yearTo || 0,
      side: p.side || "",
      image: p.image,
      oe: p.oe || "",
      description: p.description,
      condition: p.condition,
      fitments: p.fitments,
    }),
  );
writeJson(join(OUT, "featured.json"), featured);

const makes = new Set();
const modelsByMake = {};
const yearsByMakeModel = {};

function addFacet(make, model, yearFrom, yearTo) {
  if (!make) return;
  makes.add(make);
  const md = model || "";
  if (md) {
    modelsByMake[make] ??= new Set();
    modelsByMake[make].add(md);
  }
  if (yearFrom) {
    const key = `${make}\t${md}`;
    yearsByMakeModel[key] ??= new Set();
    for (let y = yearFrom; y <= (yearTo || yearFrom); y += 1) yearsByMakeModel[key].add(y);
  }
}

for (const p of products) {
  if (p.category === "small-engine") continue;
  if (Array.isArray(p.fitments) && p.fitments.length) {
    for (const f of p.fitments) addFacet(f.make, f.model, f.yearFrom, f.yearTo);
  } else {
    addFacet(p.make, p.model, p.yearFrom, p.yearTo);
  }
}

const facets = {
  makes: [...makes].sort((a, b) => a.localeCompare(b, "he")),
  modelsByMake: Object.fromEntries(
    Object.entries(modelsByMake).map(([k, v]) => [k, [...v].sort((a, b) => a.localeCompare(b, "he"))]),
  ),
  yearsByMakeModel: Object.fromEntries(
    Object.entries(yearsByMakeModel).map(([k, v]) => [k, [...v].sort((a, b) => b - a)]),
  ),
};
writeJson(join(OUT, "facets.json"), facets);

const manifest = {
  generatedAt: new Date().toISOString(),
  total: products.length,
  pageSize: PAGE_SIZE,
  chunkSize: CHUNK_SIZE,
  sheet: sheetName,
  source: xlsxPath.replace(`${ROOT}/`, ""),
  categories: categoryStats.map(({ id, name, count, offset }) => ({ id, name, count, offset })),
  chunkCount,
  pageCount,
  featuredCount: featured.length,
};
writeJson(join(OUT, "manifest.json"), manifest);
writeJson(join(OUT, "fitment-needs-review.json"), needsReviewRows);

console.log(`Catalog built from ${sheetName}: ${products.length} products (xlsx data rows ${dataRowCount})`);
console.log(`fitment needsReview=${needsReviewRows.length} normalizedCats=${[...NORMALIZE_CATEGORIES].join(",")}`);
console.log(`pages=${pageCount} chunks=${chunkCount} featured=${featured.length} imagesMatched=${withImage.length}`);
for (const c of categoryStats) {
  console.log(`  ${String(c.count).padStart(5)}  ${c.name} (${c.id})`);
}
