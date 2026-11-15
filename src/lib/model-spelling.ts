/**
 * Certain model spelling duplicates in the catalog (same make, clearly the same model).
 * Found in the 15.11.2026 catalog scan; uncertain pairs are NOT here — they are listed
 * in uncertain-spellings.csv for Matan to decide.
 *
 * Used for matching only (sameModel, search, plate lookup). Display names, chunks,
 * prices.json and the source catalog are not changed.
 *
 * Keys and values are written as canonicalModel() returns them (geresh removed).
 * A key is replaced only as whole word(s), so "גרנד סוניק" folds to "גרנד סניק"
 * while plain "סניק" and "גרנד סניק" stay different vehicles.
 */
export const CERTAIN_MODEL_SPELLINGS: Record<string, Record<string, string>> = {
  סיאט: { אטצה: "אטקה", לאון: "ליאון", אלתאה: "אלתיאה" },
  קיה: { קארנס: "קרנס", סטנגר: "סטינגר", סרטו: "סראטו", ספורטאג: "ספורטאז", ריאו: "ריו", "אקס סיד": "אקסיד" },
  "אלפא רומיאו": { גוליאטה: "גולייטה", גוליטה: "גולייטה" },
  פיאט: { ברבו: "בראבו", ברבה: "בראבה", דוקטו: "דוקאטו", פייורינו: "פיורינו" },
  שברולט: { טרקס: "טראקס", סואנה: "סוואנה", קווליר: "קוואליר", קבליר: "קוואליר", "ה h3": "H3" },
  "ג'יפ": {
    רינגלייר: "רנגלר",
    רנגאיד: "רנגייד",
    רנגיד: "רנגייד",
    גלאדיטור: "גלדיאטור",
    גלדיאוטר: "גלדיאטור",
  },
  טויוטה: {
    הילקס: "היילקס",
    היילוקס: "היילקס",
    היאס: "הייאס",
    הייס: "הייאס",
    סיאנה: "סיינה",
    קמרי: "קאמרי",
    הילנדר: "היילנדר",
    ראב4: "ראב 4",
    לנדקרוזר: "לנד קרוזר",
    פרדו: "פראדו",
    פרוייאס: "פרואייס",
    פריויה: "פרוויה",
    "ספייס מרסו": "ספייס ורסו",
    אבנסיס: "אוונסיס",
  },
  יונדאי: {
    וולוסטר: "ולוסטר",
    טרגט: "טראגט",
    טרקאן: "טראקאן",
    טראקן: "טראקאן",
    פוליסייד: "פאליסייד",
    פליסייד: "פאליסייד",
  },
  "דאצ'יה": { לוגן: "לוגאן", דסטר: "דוסטר", דאסטר: "דוסטר" },
  רנו: {
    מסטר: "מאסטר",
    קדגאר: "קאדגר",
    סוניק: "סניק",
    קליו: "קליאו",
    קלאו: "קליאו",
    קליא: "קליאו",
    לוגן: "לוגאן",
    קוליאוס: "קולאוס",
    טרפיק: "טראפיק",
    טוינגו: "טווינגו",
    לטיטיוד: "לטיטוד",
  },
  הונדה: { "cr-v": "CR V", "fr-v": "FR V", פרלוד: "פרילוד" },
  מאזדה: { mx5: "MX 5" },
  מיצובישי: {
    הנטר: "האנטר",
    פגרו: "פאגרו",
    אוטלנדר: "אווטלנדר",
    אטרז: "אטראז",
    טריטון: "טרייטון",
    "ספייס וואגון": "ספייס וואגן",
  },
  פולקסווגן: { טוראג: "טוארג", אמארוק: "אמרוק", פאטון: "פאתון" },
  "פיג'ו": { גאמפי: "גמפי" },
  ניסאן: {
    טיידה: "טידה",
    פאתפינדר: "פתפינדר",
    פתפיינדר: "פתפינדר",
    נברה: "נווארה",
    נבארה: "נווארה",
    פרימירה: "פרימרה",
  },
  סקודה: { סקאלה: "סקלה", פביה: "פאביה", פליציה: "פליסיה" },
  סיטרואן: { קסארה: "קסרה", גאמפי: "גמפי", נמו: "נימו" },
  "ב.מ.וו": { סידרה: "סדרה" },
  סובארו: { אאוטבק: "אווטבק", לגאסי: "לגסי", טריבקה: "טרייבקה" },
  "דודג'": {
    גרני: "גורני",
    נייטרו: "ניטרו",
    ראם: "רם",
    קליבר: "קאליבר",
    דורנגו: "דוראנגו",
    גלנגר: "צלנגר",
    אבנגר: "אוונגר",
  },
  קרייזלר: { וויגר: "ויאגר", וויאגר: "ויאגר", "טאון&קאנטרי": "טאון קאנטרי" },
  ביואיק: { לסייבר: "לה סייבר", "לה סיבר": "לה סייבר", לסיבר: "לה סייבר", לקרוס: "לה קרוס" },
  פורד: { מונדיאו: "מונדאו", רנגר: "ריינגר", קורייר: "קוריר" },
  מיני: { קאנטרימן: "קנטרימן" },
  דייהטסו: { מאטריה: "מטרייה" },
  סאנגיונג: { קיירון: "קאירון" },
  סוזוקי: { באלנו: "בלנו", סויפט: "סוויפט", ספלאש: "ספלש", קארי: "קרי" },
  "לנד רובר": { דפנדר: "דיפנדר" },
  אופל: { ויורו: "ויוארו" },
};

function makeKey(make: string) {
  return (make || "").toLowerCase().replace(/[׳'`״"’.]/g, "").replace(/\s+/g, " ").trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Rule = { re: RegExp; to: string };
const RULES = new Map<string, Rule[]>();
for (const [make, table] of Object.entries(CERTAIN_MODEL_SPELLINGS)) {
  const rules = Object.entries(table)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([from, to]) => ({
      // Whole-word match. \b does not work for Hebrew, so use explicit whitespace bounds.
      re: new RegExp(`(^|\\s)${escapeRe(from)}(?=\\s|$)`, "gi"),
      to,
    }));
  RULES.set(makeKey(make), rules);
}

/** Fold certain same-make spelling duplicates. Unknown make or model → unchanged. */
export function foldCertainModelSpelling(make: string, model: string): string {
  const rules = RULES.get(makeKey(make));
  let s = (model || "").replace(/\s+/g, " ").trim();
  if (!rules || !s) return s;
  for (const rule of rules) s = s.replace(rule.re, (_m, pre: string) => `${pre}${rule.to}`);
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Single-word folds that are safe in free-text search without knowing the make
 * (Hebrew, 4+ letters, and the variant is not a different model of another make).
 */
/** Variants that are a real, different model under another make (שברולט סוניק), or used there too. */
const SEARCH_FOLD_EXCLUDE = new Set(["סוניק", "דסטר"]);

export const SEARCH_SPELLING_FOLDS: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  const conflicts = new Set<string>(SEARCH_FOLD_EXCLUDE);
  for (const table of Object.values(CERTAIN_MODEL_SPELLINGS)) {
    for (const [from, to] of Object.entries(table)) {
      if (/\s/.test(from) || /\s/.test(to)) continue;
      if (from.length < 4 || !/^[\u0590-\u05FF]+$/.test(from)) continue;
      if (out[from] && out[from] !== to) conflicts.add(from);
      out[from] = to;
    }
  }
  for (const key of conflicts) delete out[key];
  return out;
})();
