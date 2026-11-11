/** Parse a free-text search into AND constraints: part type, vehicle, remaining tokens. */
import facets from "../../public/catalog/facets.json" with { type: "json" };
import abbreviations from "../../public/catalog/name-abbreviations.json" with { type: "json" };
import { sameModel } from "./model-names.ts";
import { normalizePartKey, yearBounds } from "./part-display.ts";
import type { ListingSearch, ProductFilter, SearchHit } from "./catalog-types.ts";

export type TypeRule = { category: string; sub?: string };

export type SearchIntent = {
  raw: string;
  isPartNumber: boolean;
  /** Product must match at least one rule. Empty = no type restriction from the query. */
  allowed: TypeRule[];
  make?: string;
  model?: string;
  restTokens: string[];
};

const STOP = new Set([
  "לרכב",
  "למכונית",
  "לרכבים",
  "של",
  "את",
  "עם",
  "עבור",
  "חלק",
  "חלקים",
  "פריט",
  "או",
  "רק",
  "בלבד",
  "לי",
  "גם",
  "בבקשה",
]);

const MODEL_ALIASES: Record<string, string> = {
  לוגן: "לוגאן",
  לוגאן: "לוגאן",
  דסטר: "דוסטר",
  דאסטר: "דוסטר",
  דוסטר: "דוסטר",
  גוגר: "ג'וגר",
  גוגאר: "ג'וגר",
  לודגי: "לודג'י",
  סאנדרו: "סנדרו",
};

/** English / common spellings → catalog make. Geresh-stripping is handled by normalizeKey. */
const MAKE_ALIASES: Record<string, string> = {
  dacia: "דאצ'יה",
  דצי: "דאצ'יה",
  דאצ: "דאצ'יה",
  דציה: "דאצ'יה",
  peugeot: "פיג'ו",
  dodge: "דודג'",
  jeep: "ג'יפ",
  genesis: "ג'נסיס",
  bmw: "ב.מ.וו",
  במוו: "ב.מ.וו",
  mercedes: "מרצדס",
  benz: "מרצדס",
  toyota: "טויוטה",
  hyundai: "יונדאי",
  kia: "קיה",
  honda: "הונדה",
  nissan: "ניסאן",
  mazda: "מאזדה",
  ford: "פורד",
  chevrolet: "שברולט",
  chevy: "שברולט",
  volkswagen: "פולקסווגן",
  vw: "פולקסווגן",
  audi: "אאודי",
  volvo: "וולוו",
  suzuki: "סוזוקי",
  subaru: "סובארו",
  mitsubishi: "מיצובישי",
  fiat: "פיאט",
  skoda: "סקודה",
  renault: "רנו",
  opel: "אופל",
  citroen: "סיטרואן",
  citroën: "סיטרואן",
  seat: "סיאט",
  chrysler: "קרייזלר",
  isuzu: "איסוזו",
  jaguar: "יגואר",
  lexus: "לקסוס",
  mini: "מיני",
  landrover: "לנד רובר",
  "land rover": "לנד רובר",
  alfa: "אלפא רומיאו",
  alfaromeo: "אלפא רומיאו",
  "alfa romeo": "אלפא רומיאו",
  ssangyong: "סאנגיונג",
  daihatsu: "דייהטסו",
  buick: "ביואיק",
  cadillac: "קאדילק",
  infiniti: "אינפיניטי",
  tesla: "טסלה",
  smart: "סמארט",
  porsche: "פורשה",
  gmc: "GMC",
};

type TypePattern = { keys: string[][]; allowed: TypeRule[] };

/** Longer phrases first. Keys are already normalizeKey'd (no geresh / dots / extra marks). */
const TYPE_PATTERNS: TypePattern[] = [
  { keys: [["פילטר", "מזגן"], ["מסנן", "מזגן"], ["פילטר", "קבינה"], ["מסנן", "קבינה"], ["פולן"]], allowed: [{ category: "filters", sub: "cabin" }] },
  { keys: [["פילטר", "שמן"], ["מסנן", "שמן"], ["oil", "filter"], ["filter", "oil"]], allowed: [{ category: "filters", sub: "oil" }] },
  { keys: [["פילטר", "אוויר"], ["מסנן", "אוויר"], ["פילטר", "אויר"], ["מסנן", "אויר"]], allowed: [{ category: "filters", sub: "air" }] },
  { keys: [["פילטר", "סולר"], ["מסנן", "סולר"], ["פילטר", "דלק"], ["מסנן", "דלק"]], allowed: [{ category: "filters", sub: "diesel" }] },
  { keys: [["פילטר", "גיר"], ["מסנן", "גיר"]], allowed: [{ category: "filters", sub: "gear" }] },
  { keys: [["רפידות", "בלם"], ["רפידות"], ["רפיד"]], allowed: [{ category: "brakes", sub: "pads" }] },
  { keys: [["צלחת", "בלם"], ["צלחות", "בלם"], ["צלחות"], ["דיסק", "בלם"]], allowed: [{ category: "brakes", sub: "discs" }] },
  { keys: [["נעל", "בלם"], ["נעלי", "בלם"]], allowed: [{ category: "brakes", sub: "shoes" }] },
  { keys: [["מדחס", "מזגן"], ["מדחס"]], allowed: [{ category: "ac-compressor" }] },
  { keys: [["מעבה", "מזגן"], ["מעבה"]], allowed: [{ category: "ac-condenser" }] },
  { keys: [["משאבת", "דלק"]], allowed: [{ category: "fuel-pump" }] },
  { keys: [["משאבת", "מים"]], allowed: [{ category: "water-pump" }] },
  { keys: [["בולם", "זעזועים"], ["בולם"]], allowed: [{ category: "shocks" }] },
  { keys: [["רדיאטור"], ["רדיאטורים"]], allowed: [{ category: "radiator" }] },
  { keys: [["ציריה"], ["ציריות"]], allowed: [{ category: "driveshaft" }] },
  { keys: [["נאבה"], ["נאבות"]], allowed: [{ category: "hub" }] },
  { keys: [["מסרק", "הגה"], ["מסרק"]], allowed: [{ category: "steering-rack" }] },
  { keys: [["קצה", "הגה"], ["מוט", "קישור"], ["משאבת", "הגה"]], allowed: [{ category: "steering" }] },
  { keys: [["סליל", "הצתה"], ["סלילי", "הצתה"]], allowed: [{ category: "ignition-coils" }] },
  { keys: [["חיישן", "חמצן"], ["חיישן"], ["חיישנים"]], allowed: [{ category: "sensors" }] },
  { keys: [["מצתי", "להט"], ["מצת", "להט"]], allowed: [{ category: "spark-plugs", sub: "glow" }] },
  { keys: [["מצת"], ["מצתים"]], allowed: [{ category: "spark-plugs" }] },
  { keys: [["סט", "מצמד"], ["משאבת", "מצמד"], ["מצמד"]], allowed: [{ category: "clutch" }] },
  { keys: [["טיימינג"]], allowed: [{ category: "timing" }] },
  { keys: [["בית", "מצערת"], ["בתי", "מצערת"]], allowed: [{ category: "throttle-body" }] },
  { keys: [["תפוח"], ["מתלה"], ["מתלים"], ["זרוע"]], allowed: [{ category: "suspension" }] },
  { keys: [["נורה"], ["נורות"], ["תאורה"]], allowed: [{ category: "lighting" }] },
  { keys: [["תוסף"], ["תוספים"], ["additive"], ["additives"]], allowed: [{ category: "additives" }] },
  { keys: [["ניקוי"], ["תחזוקה"]], allowed: [{ category: "cleaning-maintenance" }] },
  { keys: [["מארז"], ["מארזים"]], allowed: [{ category: "workshop-packs" }] },
  { keys: [["שמן"], ["שמנים"], ["נוזל"], ["נוזלים"], ["oil"], ["oils"], ["fluid"], ["fluids"]], allowed: [{ category: "fluids" }] },
  { keys: [["פילטר"], ["פילטרים"], ["מסנן"], ["מסננים"], ["filter"], ["filters"]], allowed: [{ category: "filters" }] },
  {
    keys: [["מזגן"]],
    allowed: [
      { category: "filters", sub: "cabin" },
      { category: "ac-compressor" },
      { category: "ac-condenser" },
    ],
  },
];

const CATALOG_MAKES = [...((facets as { makes: string[] }).makes || [])];

type AbbrRule = { abbr: string; full: string; mode?: string };
const ABBR_RULES = ((abbreviations as { rules?: AbbrRule[] }).rules || [])
  .slice()
  .sort((a, b) => b.abbr.length - a.abbr.length);

const literalAbbr = ABBR_RULES.filter((r) => r.mode !== "token");
const tokenAbbr = ABBR_RULES.filter((r) => r.mode === "token");

export function normalizeKey(value: string) {
  return (value || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[׳'`״"’]/g, "")
    .replace(/[./·]/g, "")
    .replace(/[—–_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function words(text: string): string[] {
  return normalizeKey(text).match(/[\p{L}\p{N}]+/gu) || [];
}

function expandShorthand(text: string) {
  return (text || "")
    .replace(/[מפ]\.?\s*מזגן/g, "פילטר מזגן")
    .replace(/[מפ]\.?\s*שמן/g, "פילטר שמן")
    .replace(/[מפ]\.?\s*אויר/g, "פילטר אוויר")
    .replace(/[מפ]\.?\s*אוויר/g, "פילטר אוויר")
    .replace(/[מפ]\.?\s*סולר/g, "פילטר סולר")
    .replace(/[מפ]\.?\s*גיר/g, "פילטר גיר");
}

function expandLiterals(text: string) {
  let out = expandShorthand(text || "");
  for (const rule of literalAbbr) {
    if (!rule.abbr || !out.includes(rule.abbr)) continue;
    out = out.split(rule.abbr).join(rule.full);
  }
  return out;
}

function expandToken(token: string) {
  const key = normalizeKey(token);
  for (const rule of tokenAbbr) {
    if (normalizeKey(rule.abbr) === key) return rule.full;
  }
  return token;
}

const makeByKey = new Map<string, string>();
function registerMake(alias: string, canonical: string) {
  const key = normalizeKey(alias);
  if (key) makeByKey.set(key, canonical);
}
for (const make of CATALOG_MAKES) {
  registerMake(make, make);
  registerMake(normalizeKey(make).replace(/\s+/g, ""), make);
}
for (const [alias, make] of Object.entries(MAKE_ALIASES)) registerMake(alias, make);
for (const rule of tokenAbbr) {
  const resolved = makeByKey.get(normalizeKey(rule.full)) || (CATALOG_MAKES.includes(rule.full) ? rule.full : undefined);
  if (resolved) registerMake(rule.abbr, resolved);
}
// "אלפא" from the abbreviation list should resolve to אלפא רומיאו.
const alfa = CATALOG_MAKES.find((m) => normalizeKey(m).startsWith("אלפא"));
if (alfa) registerMake("אלפא", alfa);

const makePhrases = [...new Set([...makeByKey.keys()].filter((k) => k.includes(" ")))].sort(
  (a, b) => b.length - a.length,
);

export function looksLikePartNumber(q: string) {
  const compact = normalizePartKey(q);
  return /\d/.test(compact) && compact.length >= 5;
}

export function sameMake(a?: string, b?: string) {
  if (!a || !b) return false;
  const left = resolveMake(a) || a;
  const right = resolveMake(b) || b;
  return normalizeKey(left) === normalizeKey(right);
}

export function resolveMake(raw?: string): string | undefined {
  const key = normalizeKey(raw || "");
  if (!key) return undefined;
  return makeByKey.get(key) || makeByKey.get(key.replace(/\s+/g, ""));
}

export function canonicalMake(raw?: string): string | undefined {
  return resolveMake(raw) || (raw ? raw : undefined);
}

function resolveModel(raw?: string) {
  const key = normalizeKey(raw || "");
  if (!key) return raw;
  return MODEL_ALIASES[key] || raw;
}

function consumePhrase(tokens: string[], phrase: string[]): number {
  if (!phrase.length || tokens.length < phrase.length) return -1;
  for (let i = 0; i <= tokens.length - phrase.length; i++) {
    if (phrase.every((part, offset) => tokens[i + offset] === part)) return i;
  }
  return -1;
}

function takePhrase(tokens: string[], phrase: string[]) {
  const at = consumePhrase(tokens, phrase);
  if (at < 0) return false;
  tokens.splice(at, phrase.length);
  return true;
}

function detectType(tokens: string[]): TypeRule[] {
  for (const pattern of TYPE_PATTERNS) {
    for (const phrase of pattern.keys) {
      if (takePhrase(tokens, phrase)) return pattern.allowed;
    }
  }
  return [];
}

function detectMake(tokens: string[]): string | undefined {
  for (const phrase of makePhrases) {
    const parts = phrase.split(" ");
    if (takePhrase(tokens, parts)) return makeByKey.get(phrase);
  }
  for (let i = 0; i < tokens.length; i++) {
    const resolved = makeByKey.get(tokens[i]);
    if (resolved) {
      tokens.splice(i, 1);
      return resolved;
    }
  }
  return undefined;
}

function modelsForMake(make: string): string[] {
  const map = (facets as { modelsByMake?: Record<string, string[]> }).modelsByMake || {};
  return map[make] || [];
}

function detectModel(tokens: string[], make?: string): string | undefined {
  if (!make || !tokens.length) return undefined;
  const models = modelsForMake(make);
  const keys = new Map<string, string>();
  for (const model of models) {
    const resolved = resolveModel(model) || model;
    keys.set(normalizeKey(model), resolved);
    keys.set(normalizeKey(resolved), resolved);
    const aliasKey = Object.entries(MODEL_ALIASES).find(([, v]) => normalizeKey(v) === normalizeKey(resolved))?.[0];
    if (aliasKey) keys.set(aliasKey, resolved);
  }
  for (const [alias, canonical] of Object.entries(MODEL_ALIASES)) {
    keys.set(alias, canonical);
  }
  for (let i = 0; i < tokens.length; i++) {
    const hit = keys.get(tokens[i]);
    if (hit) {
      tokens.splice(i, 1);
      return hit;
    }
  }
  return undefined;
}

function maybeStripMakePrefix(token: string) {
  if (token.length < 4 || !token.startsWith("ל")) return token;
  const rest = token.slice(1);
  if (makeByKey.has(rest) || STOP.has(rest)) return rest;
  return token;
}

export function parseSearchIntent(raw: string): SearchIntent {
  const input = (raw || "").trim();
  if (!input) return { raw: input, isPartNumber: false, allowed: [], restTokens: [] };
  if (looksLikePartNumber(input)) {
    return { raw: input, isPartNumber: true, allowed: [], restTokens: [] };
  }
  const expanded = expandLiterals(input);
  const tokens = words(expanded)
    .map((tok) => normalizeKey(expandToken(maybeStripMakePrefix(tok))))
    .filter((tok) => tok && !STOP.has(tok) && !STOP.has(`ל${tok}`));
  const allowed = detectType(tokens);
  const make = detectMake(tokens);
  const model = detectModel(tokens, make);
  return { raw: input, isPartNumber: false, allowed, make, model, restTokens: tokens };
}

export function typeAllows(category: string, sub: string | undefined, allowed: TypeRule[]) {
  if (!allowed.length) return true;
  return allowed.some((rule) => rule.category === category && (!rule.sub || rule.sub === sub));
}

function aliasesForMake(make: string) {
  const canonical = resolveMake(make) || make;
  const keys = [normalizeKey(canonical)];
  for (const [alias, target] of makeByKey) {
    if (target === canonical) keys.push(alias);
  }
  return keys;
}

function haystackWords(hit: SearchHit) {
  const bits = [
    hit.title,
    hit.titleOriginal,
    hit.make,
    hit.model,
    ...(hit.fitments || []).flatMap((f) => [f.make, f.model]),
  ]
    .filter(Boolean)
    .join(" ");
  const expanded = expandLiterals(bits);
  const toks = words(expanded).map((tok) => normalizeKey(expandToken(tok)));
  const hay = new Set(toks);
  for (const tok of toks) {
    const make = makeByKey.get(tok);
    if (make) for (const alias of aliasesForMake(make)) hay.add(alias);
  }
  return hay;
}

function tokenSatisfied(token: string, hay: Set<string>) {
  if (hay.has(token)) return true;
  const aliased = normalizeKey(MODEL_ALIASES[token] || makeByKey.get(token) || token);
  if (aliased !== token && hay.has(aliased)) return true;
  // Allow close model spellings: לוגן / לוגאן.
  if (token.length >= 4) {
    for (const word of hay) {
      if (word.length < 4) continue;
      if (word.startsWith(token) || token.startsWith(word)) return true;
    }
  }
  return false;
}

export function tokensMatchHit(hit: SearchHit, tokens: string[]) {
  if (!tokens.length) return true;
  const hay = haystackWords(hit);
  return tokens.every((tok) => tokenSatisfied(tok, hay));
}

function fitmentEntries(hit: SearchHit) {
  if (Array.isArray(hit.fitments) && hit.fitments.length) return hit.fitments;
  if (hit.make) {
    return [{ make: hit.make, model: hit.model || "", yearFrom: hit.yearFrom || 0, yearTo: hit.yearTo || 0 }];
  }
  return [];
}

export function productFitsVehicle(hit: SearchHit, make?: string, model?: string, year?: string) {
  if (!make && !model && !year) return true;
  const wantedMake = resolveMake(make) || make;
  const wantedModel = resolveModel(model) || model;
  const entries = fitmentEntries(hit);
  const y = year ? Number(String(year).replace(/["']/g, "")) : NaN;

  const yearOk = (entry: { yearFrom?: number; yearTo?: number }) => {
    if (!Number.isFinite(y)) return true;
    const from = entry.yearFrom || 0;
    const to = entry.yearTo || entry.yearFrom || 0;
    if (from && to) return y >= from && y <= to;
    if (!from && !to) {
      const bounds = yearBounds(hit.title, hit.yearFrom, hit.yearTo);
      if (bounds) return y >= bounds.from && y <= bounds.to;
    }
    return true;
  };

  const modelOk = (entryMake: string | undefined, entryModel: string | undefined) => {
    if (!wantedModel) return true;
    if (sameModel(wantedMake || entryMake || "", entryModel, wantedModel)) return true;
    const left = normalizeKey(resolveModel(entryModel) || entryModel || "");
    const right = normalizeKey(wantedModel);
    if (left && right && (left === right || left.startsWith(right) || right.startsWith(left))) return true;
    return tokensMatchHit(hit, words(wantedModel));
  };

  const makeOk = (value?: string) => Boolean(wantedMake && value && sameMake(value, wantedMake));

  if (entries.length) {
    const hitOnEntry = entries.some((entry) => makeOk(entry.make) && modelOk(entry.make, entry.model) && yearOk(entry));
    if (hitOnEntry) return true;
  } else if (wantedMake && (makeOk(hit.make) || tokensMatchHit(hit, [normalizeKey(wantedMake)]))) {
    return modelOk(hit.make, hit.model) && yearOk({ yearFrom: hit.yearFrom, yearTo: hit.yearTo });
  }

  // Title mentions the make (sister brands, missing fitment, catalog abbreviations like דצי).
  if (wantedMake && tokensMatchHit(hit, [normalizeKey(wantedMake)])) {
    return modelOk(hit.make, wantedModel ? hit.model : undefined) && yearOk({ yearFrom: hit.yearFrom, yearTo: hit.yearTo });
  }
  return false;
}

export function mergeFilterWithIntent(state: ProductFilter): ProductFilter & { allowed: TypeRule[]; restTokens: string[]; isPartNumber: boolean } {
  const intent = state.q ? parseSearchIntent(state.q) : { raw: "", isPartNumber: false, allowed: [] as TypeRule[], restTokens: [] as string[] };
  const make = intent.isPartNumber ? canonicalMake(state.make) : intent.make || canonicalMake(state.make);
  const model = intent.isPartNumber ? state.model : intent.model || state.model;
  let category = state.category;
  let sub = state.sub;
  let allowed = intent.isPartNumber ? [] : intent.allowed;

  if (allowed.length) {
    const cats = [...new Set(allowed.map((r) => r.category))];
    const compatible = !category || allowed.some((r) => r.category === category);
    if (!compatible) {
      category = cats.length === 1 ? cats[0] : undefined;
      sub = allowed.length === 1 ? allowed[0].sub : undefined;
    } else if (!category && cats.length === 1) {
      category = cats[0];
    }
    if (sub && allowed.every((r) => r.sub && r.sub !== sub)) {
      sub = allowed.length === 1 ? allowed[0].sub : undefined;
    } else if (!sub && allowed.length === 1 && allowed[0].sub && (!category || category === allowed[0].category)) {
      sub = allowed[0].sub;
    }
  }

  return {
    ...state,
    category,
    sub,
    make,
    model,
    allowed,
    restTokens: intent.isPartNumber ? [] : intent.restTokens,
    isPartNumber: intent.isPartNumber,
  };
}

export function listingSearchFromQuery(q: string, current?: ProductFilter): ProductFilter {
  const intent = parseSearchIntent(q);
  if (!q.trim()) return {};
  if (intent.isPartNumber) return { q };
  const next: ListingSearch = { ...(current || {}), q };
  delete next.page;
  if (intent.make) {
    next.make = intent.make;
    if (intent.model) next.model = intent.model;
    else {
      delete next.model;
      delete next.year;
    }
  }
  if (intent.allowed.length) {
    const cats = [...new Set(intent.allowed.map((r) => r.category))];
    if (cats.length === 1) next.category = cats[0];
    else if (next.category && !intent.allowed.some((r) => r.category === next.category)) {
      delete next.category;
      delete next.sub;
    }
    const subs = [...new Set(intent.allowed.map((r) => r.sub).filter(Boolean))] as string[];
    if (
      subs.length === 1 &&
      (!next.category || intent.allowed.some((r) => r.category === next.category && r.sub === subs[0]))
    ) {
      next.sub = subs[0];
    } else if (intent.allowed.every((r) => r.sub) && next.sub && !subs.includes(next.sub)) {
      delete next.sub;
    }
  }
  return next;
}
