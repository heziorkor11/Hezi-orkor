import type { SearchHit, VehicleFitment } from "./catalog-types.ts";

/** Volkswagen / Audi handling for the ambiguous catalog abbreviation «פול». */
export const VW_MAKE = "פולקסווגן";
export const AUDI_MAKE = "אאודי";

export type PolMakeKind = "volkswagen" | "audi" | "both" | "none";

function normalizeTok(raw: string): string {
  return (raw || "").replace(/[.'"׳’`.\-_/]/g, "").toLowerCase();
}

function tokens(text: string): string[] {
  return (text || "").match(/[A-Za-z0-9]+|[\u0590-\u05FF]+/g) || [];
}

const VW_MODELS = [
  "טוארג",
  "טווארג",
  "touareg",
  "פולו",
  "polo",
  "פסאט",
  "פאסאט",
  "passat",
  "גולף",
  "golf",
  "גטה",
  "גיטה",
  "jetta",
  "טיגואן",
  "tiguan",
  "טוראן",
  "touran",
  "שירוקו",
  "scirocco",
  "קרפטר",
  "קראפטר",
  "crafter",
  "קאדי",
  "caddy",
  "קדי",
  "טרנספורטר",
  "transporter",
  "חיפושית",
  "beetle",
  "שארן",
  "sharan",
  "אמרוק",
  "amarok",
  "בורה",
  "bora",
  "לופו",
  "lupo",
  "ארטיאון",
  "ארטאון",
  "arteon",
  "מולטיוואן",
  "multivan",
  "קליפורניה",
  "california",
  "caravelle",
  "קרבלה",
  "קראבלה",
  "eos",
  "אטלס",
  "atlas",
  "סנטנה",
  "santana",
  "קוראדו",
  "corrado",
  "טראמון",
  "tramont",
  "tayron",
  "טירון",
];

const VW_MODEL_KEYS = new Set(VW_MODELS.map(normalizeTok));
const VW_GEN_PREFIX = new Set(["פסאט", "פאסאט", "passat", "גולף", "golf", "פולו", "polo"].map(normalizeTok));

function titleTexts(hit: { title?: string; titleOriginal?: string; name?: string }): string[] {
  return [hit.title || "", hit.titleOriginal || "", "name" in hit ? String((hit as { name?: string }).name || "") : ""];
}

/**
 * True when «פול» is used as a make abbreviation, not פולו / פולי / פולן / כפול,
 * not «פול לד» (full LED), and not «פול'» as a pulley.
 */
export function hasPolMakeAbbrev(text: string): boolean {
  if (!text) return false;
  if (/פול['׳’]/.test(text) && /בובקט|4PV|פולי/.test(text) && !/(טוארג|פסאט|פולו|גולף|קאדי|קרפטר|\bLT\b|\bID\b|\bA\d|\bQ\d)/i.test(text)) {
    return false;
  }
  const re = /(^|[^\u0590-\u05FF])פול(?![\u0590-\u05FF])/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const after = text.slice(match.index + match[0].length).trimStart();
    if (/^(לד|led|להט)(?=$|[^\u0590-\u05FFa-zA-Z])/i.test(after)) continue;
    return true;
  }
  return false;
}

function isAudiModelToken(tok: string): boolean {
  const key = normalizeTok(tok);
  if (["tt", "tts", "ttrs", "r8", "etron", "etrone"].includes(key)) return true;
  return /^(?:[as]|rs|sq|q)[1-8]$/.test(key);
}

function vwModelAt(toks: string[], index: number): string | undefined {
  if (index < 0 || index >= toks.length) return undefined;
  const key = normalizeTok(toks[index]);
  const next = toks[index + 1] ? normalizeTok(toks[index + 1]) : "";
  if (VW_MODEL_KEYS.has(key)) return key;
  if (/^t[4-7]$/.test(key)) return key;
  if (/^lt(?:28|35|46)?$/.test(key)) return key;
  if (/^id[3-6]$/.test(key) || key === "idbuzz") return key;
  if ((key === "id" || key === "אידי") && /^(3|4|5|6|buzz)$/.test(next)) return `id${next}`;
  if ((key === "טי" || key === "t") && ["רוק", "קרוס", "roc", "cross"].includes(next)) return `t-${next}`;
  if (key === "פ" && /^(קלסיק|קלאסיק)$/.test(next)) return "polo-classic";
  return undefined;
}

export function modelsFromTitle(hit: { title?: string; titleOriginal?: string }): { vw: string[]; audi: string[] } {
  const vw = new Set<string>();
  const audi = new Set<string>();
  for (const text of titleTexts(hit)) {
    const toks = tokens(text);
    const keys = toks.map(normalizeTok);
    const hasPassat = keys.some((key) => ["פסאט", "פאסאט", "passat"].includes(key));
    const hasExplicitAudi = /אאודי|אודי|\baudi\b/i.test(text);
    const pol = hasPolMakeAbbrev(text);
    for (let i = 0; i < toks.length; i++) {
      const vwHit = vwModelAt(toks, i);
      if (vwHit) vw.add(vwHit);
      if (isAudiModelToken(toks[i])) {
        const prev = keys[i - 1] || "";
        if (VW_GEN_PREFIX.has(prev) || vwModelAt(toks, i - 1)) continue;
        if (hasPassat && !hasExplicitAudi && /^(a3|a4)$/.test(keys[i])) continue;
        audi.add(keys[i]);
      }
      if (keys[i] === "80" && keys[i - 1] !== "מ" && (pol || hasExplicitAudi || keys[i - 1] === "פול")) {
        audi.add("80");
      }
      if (keys[i] === "אי" && keys[i + 1] === "טרון") audi.add("etron");
      if (/^etron$/.test(keys[i])) audi.add("etron");
    }
  }
  return { vw: [...vw], audi: [...audi] };
}

function explicitMakesInTitle(hit: { title?: string; titleOriginal?: string }): Set<"vw" | "audi"> {
  const found = new Set<"vw" | "audi">();
  for (const text of titleTexts(hit)) {
    for (const tok of tokens(text)) {
      const key = normalizeTok(tok);
      if (["פולקסווגן", "וולקסווגן", "volkswagen", "vw"].includes(key)) found.add("vw");
      if (["אאודי", "אודי", "audi"].includes(key)) found.add("audi");
    }
  }
  return found;
}

function rawFitments(hit: SearchHit): VehicleFitment[] {
  if (Array.isArray(hit.fitments) && hit.fitments.length) return hit.fitments.map((entry) => ({ ...entry }));
  if (hit.make) {
    return [{ make: hit.make, model: hit.model || "", yearFrom: hit.yearFrom || 0, yearTo: hit.yearTo || 0 }];
  }
  return [];
}

function fitmentGroup(entries: VehicleFitment[]): Set<"vw" | "audi"> {
  const found = new Set<"vw" | "audi">();
  for (const entry of entries) {
    if (entry.make === VW_MAKE) found.add("vw");
    if (entry.make === AUDI_MAKE) found.add("audi");
  }
  return found;
}

function modelLooksAudiOnly(model: string): boolean {
  const toks = tokens(model || "");
  if (!toks.length) return false;
  const hasVw = toks.some((_, i) => Boolean(vwModelAt(toks, i)));
  const hasAudi = toks.some((tok, i) => {
    const key = normalizeTok(tok);
    return isAudiModelToken(tok) || key === "80" || key === "טרון" || (key === "אי" && normalizeTok(toks[i + 1] || "") === "טרון");
  });
  return hasAudi && !hasVw;
}

function vwEntriesAreSpuriousAudi(entries: VehicleFitment[]): boolean {
  const vwEntries = entries.filter((entry) => entry.make === VW_MAKE);
  return vwEntries.length > 0 && vwEntries.every((entry) => modelLooksAudiOnly(entry.model || ""));
}

function isForeignOnlyContext(hit: SearchHit): boolean {
  const { vw, audi } = modelsFromTitle(hit);
  if (vw.length || audi.length) return false;
  const text = titleTexts(hit).join(" ");
  if (/אאודי|אודי|פולקסווגן|\baudi\b|\bvolkswagen\b/i.test(text)) return false;
  return /מגאן|קנגו|ברלינגו|בובקט|פורשה|פנמרה|קררה/.test(text);
}

export function classifyPolMakes(hit: SearchHit): PolMakeKind {
  const text = titleTexts(hit).join(" ");
  const pol = hasPolMakeAbbrev(text);
  const { vw, audi } = modelsFromTitle(hit);
  const explicit = explicitMakesInTitle(hit);
  const entries = rawFitments(hit);
  const listed = fitmentGroup(entries);
  const titleVw = vw.length > 0 || explicit.has("vw");
  const titleAudi = audi.length > 0 || explicit.has("audi");
  const listedBoth = listed.has("vw") && listed.has("audi");

  if ((titleVw && titleAudi) || listedBoth || (titleVw && listed.has("audi")) || (titleAudi && listed.has("vw") && !vwEntriesAreSpuriousAudi(entries))) {
    return "both";
  }
  if (titleAudi && !titleVw) return "audi";
  if (titleVw && !titleAudi) return "volkswagen";
  if (pol && isForeignOnlyContext(hit)) return "none";
  if (pol) return "both";
  return "none";
}

function hasMake(entries: VehicleFitment[], make: string): boolean {
  return entries.some((entry) => entry.make === make);
}

function addMake(entries: VehicleFitment[], make: string, models: string[]): VehicleFitment[] {
  if (hasMake(entries, make)) return entries;
  if (models.length) {
    return [...entries, ...models.map((model) => ({ make, model, yearFrom: 0, yearTo: 0 }))];
  }
  return [...entries, { make, model: "", yearFrom: 0, yearTo: 0 }];
}

/**
 * Search/filter fitments for a single product. Never duplicates the SKU.
 * VW-only and Audi-only stay on that one make. Ambiguous «פול» items and
 * items that already list both makes match both, without inventing models.
 */
export function applyPolMakeFitments(hit: SearchHit, entries?: VehicleFitment[]): VehicleFitment[] {
  const base = (entries ?? rawFitments(hit)).map((entry) => ({ ...entry }));
  const kind = classifyPolMakes(hit);
  if (kind === "none") return base;
  const { vw, audi } = modelsFromTitle(hit);

  if (kind === "both") {
    return addMake(addMake(base, VW_MAKE, vw), AUDI_MAKE, audi);
  }
  if (kind === "audi") {
    const filtered = base.filter((entry) => !(entry.make === VW_MAKE && modelLooksAudiOnly(entry.model || "")));
    if (hasMake(filtered, AUDI_MAKE)) return filtered;
    const models = audi.length ? audi : modelLooksAudiOnly(hit.model || "") ? [hit.model || ""] : [];
    return addMake(filtered, AUDI_MAKE, models);
  }
  return addMake(base, VW_MAKE, vw);
}

export function summarizePolMakeCounts(hits: SearchHit[]): {
  volkswagen: number;
  audi: number;
  both: number;
  none: number;
  polToken: number;
} {
  const counts = { volkswagen: 0, audi: 0, both: 0, none: 0, polToken: 0 };
  for (const hit of hits) {
    const pol = hasPolMakeAbbrev(titleTexts(hit).join(" "));
    if (pol) counts.polToken += 1;
    const kind = classifyPolMakes(hit);
    if (!pol && kind !== "both") continue;
    if (kind === "volkswagen") counts.volkswagen += 1;
    else if (kind === "audi") counts.audi += 1;
    else if (kind === "both") counts.both += 1;
    else counts.none += 1;
  }
  return counts;
}
