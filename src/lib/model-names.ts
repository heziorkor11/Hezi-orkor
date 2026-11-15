/** Clean messy supplier model strings into one customer-facing name. */
import { foldCertainModelSpelling } from "./model-spelling.ts";

const JUNK = /^(שמן מנוע|גימי|חלק|כללי|universal)$/i;

const ALIAS: Record<string, string> = {
  מאליבו: "מליבו",
  ויונט: "ויואנט",
  טרוורס: "טראוורס",
  טרורס: "טראוורס",
  "טרייל בליזר": "טרייל בלייזר",
  טריילבלייזר: "טרייל בלייזר",
  טרילבלייזר: "טרייל בלייזר",
  ספרק: "ספארק",
  קמארו: "קמרו",
  קאמארו: "קמרו",
  אקיונוקס: "אקווינוקס",
  וויאגר: "ויאגר",
  ויאגר: "ויאגר",
  "גרנד וויאגר": "גרנד ויאגר",
  "גרנד ויאגר": "גרנד ויאגר",
  "PT קרוזיר": "PT קרוזר",
  "פיטי קרוזר": "PT קרוזר",
  גאז: "ג'אז",
  סיויק: "סיוויק",
  היילוקס: "היילקס",
  הילקס: "היילקס",
  אבנסיס: "אוונסיס",
  אאוריס: "אוריס",
  פיריוס: "פריוס",
  לנדקרוזר: "לנד קרוזר",
  אינסיט: "אינסייט",
  איגו: "אייגו",
  קומפס: "קומפאס",
  "גראנד שירוקי": "גרנד שירוקי",
  "גרנד צירוקי": "גרנד שירוקי",
  "גרנד צרוקי": "גרנד שירוקי",
  CRV: "CR-V",
  HRV: "HR-V",
  FRV: "FR-V",
  אאוטלנדר: "אווטלנדר",
  וורנגלר: "רנגלר",
  "C אלייס": "C אליזה",
  אדג: "אדג'",
  טורנו: "טורנאו",
  היאייס: "הייאס",
  לנדקרוזק: "לנד קרוזר",
};

/**
 * Certain model/make abbreviations from the 15.11.2026 audit.
 * Uncertain forms (קס', פול, ס.לנסר, …) are intentionally omitted.
 */
const MODEL_ABBREV: Array<{ pattern: RegExp; full: string }> = [
  { pattern: /ג[\. '׳’]*צירוקי/g, full: "גרנד שירוקי" },
  { pattern: /ג[\. '׳’]*שירוקי/g, full: "גרנד שירוקי" },
  { pattern: /ג[\. '׳’]*פונטו/g, full: "גרנד פונטו" },
  { pattern: /ג[\. '׳’]*ויטרה/g, full: "גרנד ויטרה" },
  { pattern: /ג[\. '׳’]*סניק/g, full: "גרנד סניק" },
  { pattern: /ס[\. '׳’]*וגון/g, full: "ספייס וואגון" },
  { pattern: /מ[\. '׳’]*קופר/g, full: "מיני קופר" },
  { pattern: /מ[\. '׳’]*קרלו/g, full: "מונטה קרלו" },
  { pattern: /פ[\. '׳’]*קלסיק/g, full: "פולו קלאסיק" },
  { pattern: /רנג['׳’]?\s*רובר/g, full: "ריינג' רובר" },
];

/** Qualifiers that make two otherwise overlapping model names different vehicles. */
const DISTINGUISHING = new Set([
  "גרנד",
  "grand",
  "ספייס",
  "space",
  "ספורט",
  "sport",
  "קלאסיק",
  "קלסיק",
  "classic",
  "קופה",
  "coupe",
  "קבריו",
  "קבריולה",
  "cabriolet",
]);

function stripMarks(s: string) {
  return s
    .replace(/[׳'`״"]/g, "")
    .replace(/[—–]/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Expand certain model abbreviations in a raw supplier string (display + matching). */
export function expandCertainModel(text: string): string {
  let s = text || "";
  for (const rule of MODEL_ABBREV) s = s.replace(rule.pattern, rule.full);
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Fold Cherokee spelling variants for search / sameModel only.
 * Display keeps the catalog spelling when it is not a certain abbreviation.
 */
export function foldModelSpelling(text: string): string {
  return (text || "")
    .replace(/צ['׳’]?י?רוקי/g, "שירוקי")
    .replace(/\bצירוקי\b/g, "שירוקי")
    .replace(/\bצרוקי\b/g, "שירוקי");
}

export function canonicalModel(make: string, model: string): string {
  let s = expandCertainModel(model || "");
  s = stripMarks(s);
  if (!s) return "";

  const mk = stripMarks(make || "");
  if (mk && s.toLowerCase().startsWith(mk.toLowerCase())) {
    s = s.slice(mk.length).trim();
  }

  s = s
    .replace(/שנות ייצור.*$/i, "")
    .replace(/: שנים:.*$/i, "")
    .replace(/משנת.*$/i, "")
    .replace(/מ־\s*.*$/i, "")
    .replace(/מ-\s*.*$/i, "")
    .replace(/עד\s*\d+.*$/i, "")
    .replace(/\b\d+\.\d+[TDtd]?\b/g, " ")
    .replace(/\b\d{2,4}\b/g, " ")
    .replace(/\b[nxנ]\d+(\.\d+)?\b/gi, " ")
    .replace(/\b(קד|אח|דיזל|בנזין|טורבו|היבריד|היברידי|4X4|4X2|אוטומט|ידני)\b/gi, " ")
    .replace(/(^|\s)(קד|אח|דיזל|בנזין|טורבו|היבריד|היברידי|מק|חל|אוטומט|ידני)(?=\s|$)/gi, " ")
    .replace(/(^|\s)מ(?=\s|$)/g, " ")
    .replace(/[-_/.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!s || JUNK.test(s)) return "";
  return ALIAS[s] || s;
}

function tokens(s: string): string[] {
  return foldModelSpelling(s)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function sameModel(make: string, a?: string, b?: string) {
  const left = canonicalModel(make, a || "");
  const right = canonicalModel(make, b || "");
  if (!left || !right) return false;
  // Matching only: Cherokee spellings plus certain same-make duplicates (אטצ'ה / אטקה).
  const leftKey = foldCertainModelSpelling(make, foldModelSpelling(left));
  const rightKey = foldCertainModelSpelling(make, foldModelSpelling(right));
  if (leftKey === rightKey) return true;
  const lt = tokens(leftKey);
  const rt = tokens(rightKey);
  if (!lt.length || !rt.length) return false;
  const leftSet = new Set(lt);
  const rightSet = new Set(rt);
  const extrasLeft = lt.filter((t) => !rightSet.has(t));
  const extrasRight = rt.filter((t) => !leftSet.has(t));
  // One name must be a token-subset of the other, and extras must not be distinguishing qualifiers
  // (so "גרנד שירוקי" does not match plain "שירוקי", but "גרנד שירוקי WK" matches "גרנד שירוקי").
  if (extrasLeft.length && extrasRight.length) return false;
  const extras = extrasLeft.length ? extrasLeft : extrasRight;
  return extras.length > 0 && extras.every((t) => !DISTINGUISHING.has(t));
}

export function dedupeModels(make: string, models: string[]) {
  const seen = new Map<string, string>();
  for (const raw of models) {
    const key = canonicalModel(make, raw);
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, key);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "he"));
}
