#!/usr/bin/env node
/**
 * Build the public Hezi catalog JSON from sheet לאתר only.
 * Never writes price / cost / supplier fields.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPublicCatalogRows } from "./latar-xlsx.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "catalog");
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
};

const CATEGORY_ORDER = Object.keys(CATEGORY_SLUGS);

const MAKE_ALIASES = [
  ["מרצדס בנץ", "מרצדס"],
  ["אלפא רומיאו", "אלפא רומיאו"],
  ["לנד רובר", "לנד רובר"],
  ["ריינג' רובר", "לנד רובר"],
  ["פולקסוואגן", "פולקסווגן"],
  ["פולקסווגן", "פולקסווגן"],
  ["מיצובישי", "מיצובישי"],
  ["שברולט", "שברולט"],
  ["דייהטסו", "דייהטסו"],
  ["דייהצו", "דייהטסו"],
  ["אינפיניטי", "אינפיניטי"],
  ["קרייזלר", "קרייזלר"],
  ["סיטרואן", "סיטרואן"],
  ["ג'י.אמ.סי", "GMC"],
  ["ג'י.אם.סי", "GMC"],
  ["ג׳י.אמ.סי", "GMC"],
  ["טויוטה", "טויוטה"],
  ["יונדאי", "יונדאי"],
  ["הונדה", "הונדה"],
  ["ניסאן", "ניסאן"],
  ["מאזדה", "מאזדה"],
  ["סוזוקי", "סוזוקי"],
  ["סובארו", "סובארו"],
  ["סקודה", "סקודה"],
  ["ב.מ.וו", "ב.מ.וו"],
  ["במוו", "ב.מ.וו"],
  ["אאודי", "אאודי"],
  ["איסוזו", "איסוזו"],
  ["דאצ'יה", "דאצ'יה"],
  ["דאציה", "דאצ'יה"],
  ["דאצ׳יה", "דאצ'יה"],
  ["פיג'ו", "פיג'ו"],
  ["פיג׳ו", "פיג'ו"],
  ["לקסוס", "לקסוס"],
  ["מרצדס", "מרצדס"],
  ["וולוו", "וולוו"],
  ["אופל", "אופל"],
  ["פורד", "פורד"],
  ["הונדה", "הונדה"],
  ["רנו", "רנו"],
  ["פיאט", "פיאט"],
  ["קיה", "קיה"],
  ["ג'יפ", "ג'יפ"],
  ["ג׳יפ", "ג'יפ"],
  ["טסלה", "טסלה"],
  ["פורשה", "פורשה"],
  ["יגואר", "יגואר"],
  ["קאדילק", "קאדילק"],
  ["ביואיק", "ביואיק"],
  ["דודג'", "דודג'"],
  ["מיני", "מיני"],
  ["שבר", "שברולט"],
  ["הונ ", "הונדה"],
  ["איס ", "איסוזו"],
  ["דהט", "דייהטסו"],
];

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
  let yearFrom = 0;
  let yearTo = 0;
  const bump = (a, b) => {
    if (a < 1950 || a > 2035 || b < 1950 || b > 2035) return;
    if (!yearFrom || a < yearFrom) yearFrom = a;
    if (b > yearTo) yearTo = b;
  };
  const text = String(fit || "");
  for (const m of text.matchAll(/((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})/g)) {
    bump(Number(m[1]), Number(m[2]));
  }
  const expand2 = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return v >= 50 ? 1900 + v : 2000 + v;
  };
  for (const m of text.matchAll(/מ\s*(\d{2})(?:\s*עד\s*(\d{2}))?/g)) {
    const a = expand2(m[1]);
    const b = m[2] ? expand2(m[2]) : a;
    bump(a, b);
  }
  if (!yearFrom) {
    const single = text.match(/\b((?:19|20)\d{2})\b/);
    if (single) bump(Number(single[1]), Number(single[1]));
  }
  if (yearFrom && !yearTo) yearTo = yearFrom;
  return { yearFrom, yearTo };
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
  const hay = `${fit || ""} ${name || ""}`;
  let make = "";
  let at = -1;
  let aliasLen = 0;
  for (const [alias, canonical] of MAKE_ALIASES) {
    const idx = hay.indexOf(alias);
    if (idx === -1) continue;
    if (at === -1 || idx < at || (idx === at && alias.length > aliasLen)) {
      make = canonical;
      at = idx;
      aliasLen = alias.length;
    }
  }
  let model = "";
  if (make && at >= 0 && at < (fit || "").length) {
    const rest = String(fit)
      .slice(at + aliasLen)
      .replace(/^[\s,]+/, "");
    const token = rest.split(/[,,]|מ\d{2}|(?:19|20)\d{2}/)[0] || "";
    model = token.replace(/\s+/g, " ").trim();
    if (model.length > 40) model = model.slice(0, 40).trim();
  }
  return { make, model };
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

const products = rows.map((row) => {
  const categoryName = row.category || "כללי";
  const category = slugifyCategory(categoryName);
  const { yearFrom, yearTo } = parseYears(row.vehicleFitment);
  const side = parseSide(row.vehicleFitment);
  const { make, model } = parseMakeModel(row.vehicleFitment, row.name);
  const image = matchImage(row.sku, row.oe, images);
  const description = row.description || defaultDescription(row.name, row.sku, row.vehicleFitment);
  const record = compact({
    id: row.sku,
    sku: row.sku,
    name: row.name,
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
    description,
    condition: "חלק חדש",
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

resetDir(OUT);
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
      category: p.category,
      vehicleFitment: p.vehicleFitment || "",
      make: p.make || "",
      model: p.model || "",
      yearFrom: p.yearFrom || 0,
      yearTo: p.yearTo || 0,
      side: p.side || "",
      image: p.image,
      oe: p.oe || "",
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
    category: p.category,
    oe: p.oe || "",
    make: p.make || undefined,
    model: p.model || undefined,
    yearFrom: p.yearFrom || undefined,
    yearTo: p.yearTo || undefined,
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
    }),
  );
writeJson(join(OUT, "featured.json"), featured);

const makes = new Set();
const modelsByMake = {};
const yearsByMakeModel = {};
for (const p of products) {
  if (!p.make) continue;
  makes.add(p.make);
  if (p.model) {
    modelsByMake[p.make] ??= new Set();
    modelsByMake[p.make].add(p.model);
  }
  if (p.yearFrom) {
    const key = `${p.make}\t${p.model || ""}`;
    yearsByMakeModel[key] ??= new Set();
    for (let y = p.yearFrom; y <= (p.yearTo || p.yearFrom); y += 1) yearsByMakeModel[key].add(y);
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

console.log(`Catalog built from ${sheetName}: ${products.length} products (xlsx data rows ${dataRowCount})`);
console.log(`pages=${pageCount} chunks=${chunkCount} featured=${featured.length} imagesMatched=${withImage.length}`);
for (const c of categoryStats) {
  console.log(`  ${String(c.count).padStart(5)}  ${c.name} (${c.id})`);
}
