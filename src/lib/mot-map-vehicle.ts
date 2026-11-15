/** Conservative mapping from MOT registry fields onto catalog make/model/year. */
import facets from "../../public/catalog/facets.json" with { type: "json" };
import { isAmbiguousMotModelKey, lookupMotModelAlias, MOT_MODEL_ALIASES } from "./mot-model-aliases.ts";
import { canonicalModel, sameModel } from "./model-names.ts";
import { canonicalMake, normalizeKey, resolveMake, words } from "./search-intent.ts";

export type MotVehicleFields = {
  manufacturer: string;
  commercialName: string;
  year?: number;
  trim?: string;
  fuel?: string;
  engine?: string;
  displacement?: number;
  /** Raw MOT type label when present, e.g. אוטובוס. */
  vehicleType?: string;
  twoWheeler?: boolean;
};

export type MotMapping = {
  confidence: "mapped" | "unmapped";
  make?: string;
  model?: string;
  year?: string;
  reason?: string;
};

export type MotDisplayVehicle = MotVehicleFields & {
  mapping: MotMapping;
};

const catalogMakes = [...(((facets as { makes?: string[] }).makes || []))];
const modelsByMake = (facets as { modelsByMake?: Record<string, string[]> }).modelsByMake || {};
const yearsByMakeModel = (facets as { yearsByMakeModel?: Record<string, number[]> }).yearsByMakeModel || {};

/** Country / plant suffixes that appear after the make in tozeret_nm. */
const COUNTRY_SUFFIX = [
  "ד. קוריאה",
  "ד קוריאה",
  "ד. קורי",
  "ד קורי",
  "דרום קוריאה",
  "קוריאה",
  "קורי",
  "יפן",
  "גרמניה",
  "צרפת",
  "איטליה",
  "ספרד",
  "אנגליה",
  "בריטניה",
  "ארה\"ב",
  "ארה״ב",
  'ארהב"',
  "ארהב",
  "ארצות הברית",
  "צ'כיה",
  "צכיה",
  "שבדיה",
  "שוודיה",
  "סין",
  "תאילנד",
  "הודו",
  "טורקיה",
  "הולנד",
  "בלגיה",
  "פולין",
  "מקסיקו",
  "מקסי",
  "ברזיל",
  "דרום אפריקה",
  "הונגריה",
  "רומניה",
  "סלובקיה",
  "אוסטריה",
  "שווייץ",
  "שוויץ",
  "טייוואן",
  "טייוון",
  "פורטוגל",
  "רוסיה",
  "אוקראינה",
  "מרוקו",
  "אינדונזיה",
  "מלזיה",
  "פיליפינים",
  "אוסטרליה",
  "קנדה",
  "ארגנטינה",
  "סלובניה",
  "בולגריה",
  "יוון",
  "אירלנד",
];

/** Extra MOT manufacturer spellings → catalog make. */
const MOT_MAKE_ALIASES: Record<string, string> = {
  אודי: "אאודי",
  "אאודי": "אאודי",
  "מ.ב.": "מרצדס",
  "מ.ב": "מרצדס",
  מב: "מרצדס",
  "מרצדס בנץ": "מרצדס",
  "מרצדס-בנץ": "מרצדס",
  "ב מ ו": "ב.מ.וו",
  "ב.מ.ו": "ב.מ.וו",
  "ב.מ.ו.": "ב.מ.וו",
  במוו: "ב.מ.וו",
  "ב מ וו": "ב.מ.וו",
  פולקסוואגן: "פולקסווגן",
  "פ.ו.": "פולקסווגן",
  "גי אם סי": "GMC",
  "ג'י.אם.סי": "GMC",
  "ג'י אם סי": "GMC",
  "gmc": "GMC",
  הונדאי: "יונדאי",
  מזדה: "מאזדה",
  "מאזדא": "מאזדה",
  קאדילאק: "קאדילק",
  קדילאק: "קאדילק",
  קדילק: "קאדילק",
  "גי.אם.סי": "GMC",
  "ג'נסיס": "ג'נסיס",

  ניסן: "ניסאן",
  סוברו: "סובארו",
  "אלפא רומאו": "אלפא רומיאו",
  "אלפא-רומיאו": "אלפא רומיאו",
  לנדרובר: "לנד רובר",
  "לנד-רובר": "לנד רובר",
  "רנג רובר": "לנד רובר",
  "minicooper": "מיני",
  "mini cooper": "מיני",
  "mercedes benz": "מרצדס",
  "mercedes-benz": "מרצדס",
  "vw": "פולקסווגן",
  "bmw": "ב.מ.וו",
};

/** Latin manufacturer prefixes that MOT often prepends to kinuy_mishari ("MAZDA 3"). */
const LATIN_MAKE_PREFIXES: Array<{ latin: string; make: string }> = [
  { latin: "toyota", make: "טויוטה" },
  { latin: "mazda", make: "מאזדה" },
  { latin: "honda", make: "הונדה" },
  { latin: "nissan", make: "ניסאן" },
  { latin: "mitsubishi", make: "מיצובישי" },
  { latin: "suzuki", make: "סוזוקי" },
  { latin: "subaru", make: "סובארו" },
  { latin: "hyundai", make: "יונדאי" },
  { latin: "kia", make: "קיה" },
  { latin: "peugeot", make: "פיג'ו" },
  { latin: "citroen", make: "סיטרואן" },
  { latin: "citroën", make: "סיטרואן" },
  { latin: "renault", make: "רנו" },
  { latin: "dacia", make: "דאצ'יה" },
  { latin: "fiat", make: "פיאט" },
  { latin: "volkswagen", make: "פולקסווגן" },
  { latin: "vw", make: "פולקסווגן" },
  { latin: "audi", make: "אאודי" },
  { latin: "bmw", make: "ב.מ.וו" },
  { latin: "mercedes", make: "מרצדס" },
  { latin: "mercedes-benz", make: "מרצדס" },
  { latin: "ford", make: "פורד" },
  { latin: "chevrolet", make: "שברולט" },
  { latin: "chevy", make: "שברולט" },
  { latin: "opel", make: "אופל" },
  { latin: "skoda", make: "סקודה" },
  { latin: "seat", make: "סיאט" },
  { latin: "volvo", make: "וולוו" },
  { latin: "jeep", make: "ג'יפ" },
  { latin: "lexus", make: "לקסוס" },
  { latin: "isuzu", make: "איסוזו" },
  { latin: "mini", make: "מיני" },
  { latin: "tesla", make: "טסלה" },
  { latin: "porsche", make: "פורשה" },
];

const TRIM_SUFFIX = new Set(
  [
    "היבריד",
    "היברידית",
    "היברידי",
    "פלאגין",
    "וואגן",
    "סטיישן",
    "האצבק",
    "האצ'בק",
    "קופה",
    "קבריולט",
    "קברולט",
    "סדאן",
    "סלון",
    "פלוס",
    "טורבו",
    "דיזל",
    "בנזין",
    "אוטומט",
    "ידני",
    "אוטומטית",
    "at",
    "mt",
    "cc",
    "sw",
    "gt",
    "gti",
    "tsi",
    "tdi",
    "tfsi",
    "crdi",
    "gdi",
    "tce",
    "dci",
    "אח",
    "קד",
    "תח",
  ].map((s) => normalizeKey(s)),
);

function text(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function yearNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/\D/g, ""));
  if (!Number.isFinite(n)) return undefined;
  const y = Math.trunc(n);
  if (y < 1970 || y > 2035) return undefined;
  return y;
}

function catalogMakeOf(raw?: string): string | undefined {
  const resolved = resolveMake(raw) || MOT_MAKE_ALIASES[normalizeKey(raw || "")];
  if (!resolved) return undefined;
  const canonical = canonicalMake(resolved) || resolved;
  return catalogMakes.find((m) => normalizeKey(m) === normalizeKey(canonical)) || undefined;
}

function stripCountry(raw: string) {
  let s = raw.trim();
  const sorted = [...COUNTRY_SUFFIX].sort((a, b) => b.length - a.length);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of sorted) {
      const key = normalizeKey(s);
      const suf = normalizeKey(suffix);
      if (key === suf) return s;
      if (key.endsWith(" " + suf) || key.endsWith(suf)) {
        const cut = s.length - suffix.length;
        // cut on original by suffix length is fragile; use regex on end
        const re = new RegExp(`[\\s\\-]*${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i");
        const next = s.replace(re, "").trim();
        if (next && next !== s) {
          s = next;
          changed = true;
          break;
        }
      }
    }
  }
  return s;
}

const motMakeAliasIndex = new Map<string, string>();
for (const [alias, make] of Object.entries(MOT_MAKE_ALIASES)) {
  const key = normalizeKey(alias);
  if (key && !motMakeAliasIndex.has(key)) motMakeAliasIndex.set(key, make);
  const compact = key.replace(/\s+/g, "");
  if (compact && !motMakeAliasIndex.has(compact)) motMakeAliasIndex.set(compact, make);
}

function lookupMakeAlias(raw: string) {
  const key = normalizeKey(raw);
  if (!key) return undefined;
  return (
    catalogMakeOf(raw) ||
    catalogMakeOf(motMakeAliasIndex.get(key)) ||
    catalogMakeOf(motMakeAliasIndex.get(key.replace(/\s+/g, "")))
  );
}

/** Map a MOT manufacturer string (tozeret_nm / tozar) onto a single catalog make. */
export function mapMotMake(...rawParts: Array<string | undefined>): string | undefined {
  const found = new Set<string>();
  for (const part of rawParts) {
    const raw = text(part);
    if (!raw) continue;
    const direct = lookupMakeAlias(raw);
    if (direct) found.add(direct);
    const stripped = stripCountry(raw);
    const afterStrip = lookupMakeAlias(stripped);
    if (afterStrip) found.add(afterStrip);

    const tokens = words(stripped);
    // Longest phrase first against catalog makes and aliases.
    const phrases = [
      ...catalogMakes,
      ...Object.keys(MOT_MAKE_ALIASES),
    ].sort((a, b) => normalizeKey(b).length - normalizeKey(a).length);
    for (const phrase of phrases) {
      const pk = normalizeKey(phrase);
      if (!pk || pk.length < 2) continue;
      const sk = normalizeKey(stripped);
      if (sk === pk || sk.startsWith(pk + " ") || sk.endsWith(" " + pk) || sk.includes(" " + pk + " ")) {
        const hit = lookupMakeAlias(phrase);
        if (hit) found.add(hit);
      }
    }
    // Try first 1–3 tokens (handles "קיה ד קורי").
    for (let n = Math.min(3, tokens.length); n >= 1; n--) {
      const hit = lookupMakeAlias(tokens.slice(0, n).join(" "));
      if (hit) found.add(hit);
    }
  }
  if (found.size === 1) return [...found][0];
  return undefined;
}

function aliasModel(raw: string, allowAmbiguous: boolean) {
  if (!raw) return undefined;
  if (!allowAmbiguous && isAmbiguousMotModelKey(raw)) return undefined;
  return lookupMotModelAlias(raw);
}

function escapeRe(token: string) {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMakeFromModel(make: string, commercial: string) {
  let s = commercial.trim();
  const keys = new Set<string>([make, ...words(make)].filter(Boolean));
  for (const { latin, make: heb } of LATIN_MAKE_PREFIXES) {
    if (normalizeKey(heb) === normalizeKey(make) || normalizeKey(latin) === normalizeKey(make)) {
      keys.add(latin);
    }
  }
  for (const [alias, target] of Object.entries(MOT_MAKE_ALIASES)) {
    if (normalizeKey(target) === normalizeKey(make) || normalizeKey(alias) === normalizeKey(make)) {
      keys.add(alias);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    const withoutNew = s.replace(/^(new|all[\s-]?new|the)\s+/i, "").trim();
    if (withoutNew && withoutNew !== s) {
      s = withoutNew;
      changed = true;
    }
    for (const token of keys) {
      const spaced = new RegExp(`^${escapeRe(token)}\\s+`, "i");
      const glued = new RegExp(`^${escapeRe(token)}(?=\\d)`, "i");
      const afterSpace = s.replace(spaced, "");
      const afterGlued = s.replace(glued, "");
      const cand = afterSpace !== s ? afterSpace : afterGlued !== s ? afterGlued : s;
      if (cand && cand !== s) {
        s = cand.trim();
        changed = true;
        break;
      }
    }
  }
  return s.trim();
}

/** Body / powertrain / facelift tokens MOT appends to a commercial name. Not distinctive model words (CROSS, VERSO, AIRCROSS, CC). */
const STRIPPABLE_MODEL_SUFFIXES = new Set(
  [
    "sdn", "sedan", "saloon", "hb", "hatch", "hatchback", "hat",
    "sw", "wagon", "estate", "tourer", "touring", "ts", "sb",
    "sportback",
    "liftback", "lb",
    "cabrio", "cabriolet", "convertible", "conv",
    "hsd", "hybrid", "hev", "phev", "mhev", "plugin", "plug-in", "plug in",
    "ev", "electric", "bev", "tdi", "tsi", "tfsi", "gdi", "crdi", "dci", "tce", "hdi", "cdti", "cdi",
    "petrol", "diesel", "gasoline", "bensin",
    "4wd", "4x4", "awd", "2wd", "fwd", "rwd", "4matic", "xdrive", "quattro",
    "at", "mt", "cvt", "dct", "auto", "automatic", "manual",
    "fl", "facelift",
    "bluetec", "d4d",
    "היבריד", "היברידית", "היברידי", "פלאגין", "חשמלי",
    "סדאן", "סלון", "האצבק", "האצ'בק", "סטיישן", "וואגן",
    "דיזל", "בנזין", "אוטומט", "ידני", "אוטומטית", "טורבו",
  ].map((s) => normalizeKey(s)),
);

function isStrippableModelSuffix(tok: string) {
  const key = normalizeKey(tok);
  return Boolean(key) && STRIPPABLE_MODEL_SUFFIXES.has(key);
}

function stripTrailingDisplacement(name: string) {
  // Decimal litres (1.6, 2.0) or 3–4 digit cc (1600, 2000), optionally with t/d/i/l.
  // Do not strip model numbers such as RAV 4, Mazda 3, or Golf 7.
  return name.replace(/\s+(\d+\.\d+|\d{3,4})[tdil]?\s*$/i, "").trim();
}

/**
 * Longest-first variants of a MOT commercial name after dropping body, powertrain
 * and facelift suffixes. "COROLLA SDN HSD" and "COROLLA HSD SDN" both reduce to "COROLLA".
 * Distinct model words such as CROSS / VERSO are kept.
 */
export function commercialNameVariants(make: string, commercialName: string): string[] {
  const cleaned = stripMakeFromModel(make, text(commercialName));
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const next = value.replace(/\s+/g, " ").trim();
    const key = normalizeKey(next);
    if (!next || seen.has(key)) return;
    seen.add(key);
    out.push(next);
    const trimmed = stripTrailingDisplacement(next);
    if (trimmed && normalizeKey(trimmed) !== key) {
      push(trimmed);
    }
  };
  push(cleaned);
  const toks = words(cleaned);
  while (toks.length > 1 && isStrippableModelSuffix(toks[toks.length - 1])) {
    toks.pop();
    push(toks.join(" "));
  }
  push(stripPowertrainSuffix(cleaned));
  return out;
}


const FAMILY_BLOCKLIST = new Set(
  ["קרוס", "cross", "ורסו", "verso", "ספורט", "sport", "קופה"].map((s) => normalizeKey(s)),
);

function remainderLooksLikeTrim(remainder: string) {
  const tokens = words(remainder);
  if (!tokens.length) return true;
  return tokens.every((tok) => {
    if (TRIM_SUFFIX.has(normalizeKey(tok))) return true;
    if (/^\d+(\.\d+)?$/.test(tok)) return true;
    if (/^[nנ]\d+$/i.test(tok)) return true;
    if (tok.length <= 2 && /[a-z0-9]/i.test(tok)) return true;
    return false;
  });
}

function remainderIsOtherModel(remainder: string, make: string, base: string) {
  const key = normalizeKey(remainder);
  if (!key) return false;
  if (FAMILY_BLOCKLIST.has(key) || words(remainder).some((w) => FAMILY_BLOCKLIST.has(normalizeKey(w)))) {
    return true;
  }
  const models = modelsByMake[make] || [];
  const candidate = canonicalModel(make, `${base} ${remainder}`.trim());
  const other = canonicalModel(make, remainder);
  if (other && normalizeKey(other) !== normalizeKey(base) && models.some((m) => sameModel(make, m, other))) {
    // remainder itself is a known distinct model (e.g. "קרוס")
    const baseKey = normalizeKey(canonicalModel(make, base));
    if (normalizeKey(other) !== baseKey) return true;
  }
  if (candidate && normalizeKey(candidate) !== normalizeKey(base) && !remainderLooksLikeTrim(remainder)) {
    return true;
  }
  return false;
}

function stripPowertrainSuffix(name: string) {
  return name
    .replace(/\s+(plug[\s-]?in|plugin|phev|hev|hybrid|electric|היברידית|היברידי|היבריד|חשמלי|פלאגין)$/i, "")
    .replace(/\s+\bev\b$/i, "")
    .trim();
}

export function catalogModelsForMake(make: string) {
  return modelsByMake[make] || [];
}

function compactKey(value: string) {
  return normalizeKey(value).replace(/\s+/g, "");
}

/** Keep numeric model codes (208, 500, 3008) that canonicalModel treats as years and drops. */
function keepPlateModel(make: string, raw: string): string | undefined {
  const canon = canonicalModel(make, raw);
  if (canon) return canon;
  const compact = text(raw).replace(/[\s-]+/g, "");
  const token =
    compact.match(/[A-Za-z]{0,3}\d{2,4}/)?.[0] ||
    text(raw).match(/[A-Za-z]{0,3}\d{2,4}/)?.[0] ||
    text(raw).match(/^\d{2,4}$/)?.[0];
  if (!token) return undefined;
  if (/^\d{2,4}$/.test(token) || /^[A-Za-z]{1,3}\d{1,4}$/.test(token)) return token;
  return undefined;
}

function uniqueCanonical(make: string, models: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const model of models) {
    const kept = keepPlateModel(make, model);
    if (!kept) continue;
    const grouped = aliasModel(kept, true) || kept;
    const key = compactKey(grouped);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(grouped);
  }
  return out;
}

function modelsEquivalent(make: string, a: string, b: string) {
  if (!a || !b) return false;
  if (normalizeKey(a) === normalizeKey(b) || compactKey(a) === compactKey(b)) return true;
  const left = aliasModel(a, true) || a;
  const right = aliasModel(b, true) || b;
  if (normalizeKey(left) === normalizeKey(right) || compactKey(left) === compactKey(right)) return true;
  const ca = canonicalModel(make, left) || left;
  const cb = canonicalModel(make, right) || right;
  if (ca && cb && (normalizeKey(ca) === normalizeKey(cb) || compactKey(ca) === compactKey(cb))) return true;
  return false;
}

function hitsForVariant(make: string, variant: string, models: string[]): string[] {
  if (!variant) return [];
  const wantedRaw = [variant];
  const aliased = aliasModel(variant, true);
  if (aliased) wantedRaw.push(aliased);
  const wanted = wantedRaw
    .map((w) => normalizeKey(keepPlateModel(make, w) || canonicalModel(make, w) || w))
    .filter(Boolean);
  const wantedCompact = wanted.map((w) => w.replace(/\s+/g, ""));
  const hits: string[] = [];

  for (const model of models) {
    const nk = normalizeKey(model);
    const ck = compactKey(model);
    for (let i = 0; i < wanted.length; i++) {
      const w = wanted[i];
      const wc = wantedCompact[i];
      if (nk === w || ck === wc) {
        hits.push(model);
        break;
      }
      if (nk.startsWith(w + " ")) {
        const remainder = nk.slice(w.length).trim();
        if (!remainderIsOtherModel(remainder, make, w) && remainderLooksLikeTrim(remainder)) {
          hits.push(model);
        }
        break;
      }
    }
    const latin = normalizeKey(variant);
    if (/^[a-z0-9][a-z0-9 \-]+$/i.test(variant) && latin.length >= 2) {
      const modelKey = normalizeKey(model);
      const latinCompact = latin.replace(/\s+/g, "");
      let latinHit = modelKey === latin || compactKey(model) === latinCompact;
      if (!latinHit && modelKey.startsWith(latin + " ")) {
        const remainder = modelKey.slice(latin.length).trim();
        latinHit = !remainderIsOtherModel(remainder, make, latin) && remainderLooksLikeTrim(remainder);
      }
      if (latinHit && !hits.includes(model)) hits.push(model);
    }
  }

  const preferred = aliased || variant;
  for (const model of models) {
    if (hits.includes(model)) continue;
    if (modelsEquivalent(make, model, preferred)) {
      hits.push(model);
      continue;
    }
    if (sameModel(make, model, preferred)) {
      const a = normalizeKey(canonicalModel(make, model) || model);
      const b = normalizeKey(canonicalModel(make, preferred) || preferred);
      if (a && b && (a === b || compactKey(a) === compactKey(b))) hits.push(model);
    }
  }
  return uniqueCanonical(make, hits);
}

/** Collect catalog models that confidently match a MOT commercial name for a known make. */
export function matchCatalogModels(make: string, commercialName: string): string[] {
  const variants = commercialNameVariants(make, commercialName);
  if (!variants.length) return [];
  const models = uniqueCanonical(make, catalogModelsForMake(make));
  if (!models.length) return [];
  for (const variant of variants) {
    const hits = hitsForVariant(make, variant, models);
    if (hits.length) return hits;
  }
  return [];
}

function pickFamilyBase(make: string, matches: string[], commercialName: string): string | undefined {
  if (!matches.length) return undefined;
  const variants = commercialNameVariants(make, commercialName);
  let preferred: string | undefined;
  for (const variant of variants) {
    const aliased = aliasModel(variant, true);
    if (aliased) {
      preferred = aliased;
      break;
    }
  }
  if (!preferred) preferred = variants[variants.length - 1] || variants[0];

  // An exact (or alias-equivalent) catalog name is enough. Dirty extra hits
  // such as "I20 I30" or "NRF CX5" must not veto a confident exact match.
  const exact = matches.find((m) => modelsEquivalent(make, m, preferred || ""));
  if (exact) return exact;

  if (matches.every((m) => modelsEquivalent(make, m, matches[0]))) {
    const hebrew = matches.find((m) => /[\u0590-\u05FF]/.test(m));
    return hebrew || exact || matches[0];
  }

  const sorted = [...matches].sort((a, b) => a.length - b.length || a.localeCompare(b, "he"));
  const base = exact || sorted[0];
  const sameFamily = sorted.every((m) => {
    if (modelsEquivalent(make, m, base)) return true;
    const k = normalizeKey(m);
    const baseKey = normalizeKey(base);
    if (!k.startsWith(baseKey + " ")) return false;
    const rest = k.slice(baseKey.length).trim();
    return remainderLooksLikeTrim(rest) && !remainderIsOtherModel(rest, make, base);
  });
  if (sameFamily) return base;
  return undefined;
}


function yearsForFamily(make: string, base: string, family: string[]) {
  const years = new Set<number>();
  const names = new Set([base, ...family].map((m) => canonicalModel(make, m) || m));
  for (const [key, list] of Object.entries(yearsByMakeModel)) {
    const [mk, model = ""] = key.split("\t");
    if (mk !== make) continue;
    const canon = canonicalModel(make, model) || model;
    if (![...names].some((n) => normalizeKey(n) === normalizeKey(canon) || sameModel(make, n, canon))) continue;
    for (const y of list || []) if (Number.isFinite(y)) years.add(Number(y));
  }
  return [...years].sort((a, b) => a - b);
}

export function mapMotVehicle(fields: MotVehicleFields): MotDisplayVehicle {
  const mapping: MotMapping = { confidence: "unmapped" };
  const display: MotDisplayVehicle = { ...fields, mapping };

  if (fields.twoWheeler) {
    mapping.reason = "זהו רכב דו-גלגלי. בחרו חלק או רכב ידנית — לא נציג חלקים לרכב שאינם קשורים.";
    return display;
  }

  const make = mapMotMake(fields.manufacturer);
  if (!make) {
    mapping.reason = "לא הצלחנו להתאים את היצרן לקטלוג בוודאות. בחרו יצרן, דגם ושנה ידנית.";
    return display;
  }
  mapping.make = make;

  const commercial = text(fields.commercialName);
  if (!commercial) {
    mapping.reason = "במאגר אין שם דגם מסחרי. בחרו דגם ושנה ידנית — לא נציג חלקים לא קשורים.";
    return display;
  }

  const matches = matchCatalogModels(make, commercial);
  const model = pickFamilyBase(make, matches, commercial);
  if (!model) {
    mapping.reason = "זיהינו את היצרן, אך לא הצלחנו להתאים את הדגם לקטלוג בוודאות. בחרו דגם ושנה ידנית.";
    return display;
  }
  mapping.model = model;

  const year = fields.year;
  if (year) {
    const years = yearsForFamily(make, model, matches);
    if (years.length) {
      const min = years[0];
      const max = years[years.length - 1];
      if (year < min || year > max) {
        mapping.reason = "שנת הייצור מחוץ לטווח החלקים שבקטלוג לדגם הזה. בחרו שנה ידנית — לא נציג חלקים לא קשורים.";
        mapping.year = String(year);
        return display;
      }
    }
    mapping.year = String(year);
  }

  mapping.confidence = "mapped";
  return display;
}

export function mappingCoverage() {
  const makeHits: string[] = [];
  const makeMiss: string[] = [];
  for (const make of catalogMakes) {
    const probes = [
      make,
      `${make} יפן`,
      `${make} ד. קוריאה`,
      `${make} גרמניה`,
      `${make} צרפת`,
    ];
    const ok = probes.some((p) => mapMotMake(p) === make);
    if (ok) makeHits.push(make);
    else makeMiss.push(make);
  }

  let modelsTotal = 0;
  let modelsAliased = 0;
  const byMake: Record<string, { total: number; aliased: number }> = {};
  for (const make of catalogMakes) {
    const models = uniqueCanonical(make, catalogModelsForMake(make));
    let aliased = 0;
    for (const model of models) {
      modelsTotal += 1;
      const key = normalizeKey(model);
      const hasAlias = Object.values(MOT_MODEL_ALIASES).some((v) => normalizeKey(v) === key || normalizeKey(canonicalModel(make, v)) === key);
      const hasLatin = /[a-zA-Z]{2,}/.test(model);
      if (hasAlias || hasLatin) {
        aliased += 1;
        modelsAliased += 1;
      }
    }
    byMake[make] = { total: models.length, aliased };
  }

  return {
    catalogMakes: catalogMakes.length,
    makesMappedByProbe: makeHits.length,
    makesUnmappedByProbe: makeMiss,
    catalogModelsCanonical: modelsTotal,
    modelsWithAliasOrLatin: modelsAliased,
    byMake,
  };
}

export { catalogMakes, yearNumber, text as motText };
