/**
 * Shared vehicle fitment normalization for the Hezi catalog build.
 * Designed to apply catalog-wide; callers opt in per category via `enabled`.
 */

/** Historical allow-list; process-catalog now enables parseFitments catalog-wide. Kept for callers/tests. */
export const NORMALIZE_CATEGORIES = new Set(["spark-plugs", "small-engine"]);

/** [alias, canonical] — longer / more specific aliases first when scanning. */
export const MAKE_ALIASES = [
  ["מרצדס בנץ", "מרצדס"],
  ["אלפא רומיאו", "אלפא רומיאו"],
  ["אלפא רומאו", "אלפא רומיאו"],
  ["אלפא ", "אלפא רומיאו"],
  ["לנד רובר", "לנד רובר"],
  ["ריינג' רובר", "לנד רובר"],
  ["פולקסוואגן", "פולקסווגן"],
  ["פולקסווגן", "פולקסווגן"],
  ["פולקס ווגן", "פולקסווגן"],
  ["פולקס ", "פולקסווגן"],
  ["מיצובישי", "מיצובישי"],
  ["שברולט", "שברולט"],
  ["שבר ", "שברולט"],
  ["דייהטסו", "דייהטסו"],
  ["דייהצו", "דייהטסו"],
  ["דיהטסו", "דייהטסו"],
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
  ["מזדה", "מאזדה"],
  ["סוזוקי", "סוזוקי"],
  ["סובארו", "סובארו"],
  ["סקודה", "סקודה"],
  ["ב.מ.וו", "ב.מ.וו"],
  ["במוו", "ב.מ.וו"],
  ["ב מ וו", "ב.מ.וו"],
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
  ["וולבו", "וולוו"],
  ["ולוו", "וולוו"],
  ["אופל", "אופל"],
  ["פורד", "פורד"],
  ["רנו", "רנו"],
  ["פיאט", "פיאט"],
  ["קיה", "קיה"],
  ["ג'יפ", "ג'יפ"],
  ["ג׳יפ", "ג'יפ"],
  ["גיפ", "ג'יפ"],
  ["טסלה", "טסלה"],
  ["פורשה", "פורשה"],
  ["יגואר", "יגואר"],
  ["קאדילק", "קאדילק"],
  ["ביואיק", "ביואיק"],
  ["דודג'", "דודג'"],
  ["מיני", "מיני"],
  ["סיאט", "סיאט"],
  ["סאנגיונג", "סאנגיונג"],
  ["ג'נסיס", "ג'נסיס"],
  ["ג׳נסיס", "ג'נסיס"],
  ["גנסיס", "ג'נסיס"],
  ["סמארט", "סמארט"],
  ["סמרט", "סמארט"],
  // Supplier abbreviations (word-ish; matched carefully)
  ["הונ ", "הונדה"],
  ["טוי ", "טויוטה"],
  ["יונ ", "יונדאי"],
  ["ניס ", "ניסאן"],
  ["פגו ", "פיג'ו"],
  ["מזד ", "מאזדה"],
  ["מיצ ", "מיצובישי"],
  ["מרצ ", "מרצדס"],
  ["סאנ ", "סאנגיונג"],
  ["סוב ", "סובארו"],
  ["סקו ", "סקודה"],
  ["פול ", "פולקסווגן"],
  ["פיא ", "פיאט"],
  ["יגו ", "יגואר"],
  ["במו ", "ב.מ.וו"],
  ["ולו ", "וולוו"],
  ["אלפ ", "אלפא רומיאו"],
];

/** English brand tokens → Hebrew canonical */
const EN_BRAND = [
  [/\bChevrolet\b/gi, "שברולט"],
  [/\bBMW\b/g, "ב.מ.וו"],
  [/\bMINI\b/gi, "מיני"],
  [/\bVolkswagen\b/gi, "פולקסווגן"],
  [/\bSeat\b/gi, "סיאט"],
  [/\bFord\b/gi, "פורד"],
  [/\bBuick\b/gi, "ביואיק"],
  [/\bOpel\b/gi, "אופל"],
  [/\bPeugeot\b/gi, "פיג'ו"],
  [/\bCitro[eë]n\b/gi, "סיטרואן"],
  [/\bGenesis\b/gi, "ג'נסיס"],
  [/\bSmart\b/gi, "סמארט"],
];

/** Model spelling → most common Israeli form */
export const MODEL_ALIASES = {
  גאז: "ג'אז",
  סיויק: "סיוויק",
  סונאטה: "סונטה",
  CRV: "CR-V",
  CRZ: "CR-Z",
  HRV: "HR-V",
  "ראב 4": "RAV4",
  "RAV 4": "RAV4",
  אבנסיס: "אוונסיס",
  היאייס: "הייאס",
  אאוטלנדר: "אווטלנדר",
  וורנגלר: "רנגלר",
  רנגלר: "רנגלר",
  "גרנד צ'ירוקי": "גרנד שירוקי",
  "גרנד צירוקי": "גרנד שירוקי",
  "גראנד שירוקי": "גרנד שירוקי",
  "B3 אימפרזה": "אימפרזה",
  "C אלייס": "C אליזה",
  "איר קרוס": "איירקרוס",
  אדג: "אדג'",
  טורנו: "טורנאו",
  מאליבו: "מליבו",
  ספרק: "ספארק",
  קאמרו: "קמרו",
  "טרייל בליזר": "טרייל בלייזר",
  טריילבלייזר: "טרייל בלייזר",
  היילוקס: "היילקס",
  הילקס: "היילקס",
  אאוריס: "אוריס",
  פיריוס: "פריוס",
  לנדקרוזר: "לנד קרוזר",
  לנדקרוזק: "לנד קרוזר",
  אינסיט: "אינסייט",
  איגו: "אייגו",
  קומפס: "קומפאס",
  ויאגר: "ויאגר",
  ויונט: "ויואנט",
  פגרו: "פאג'רו",
  אקסטרייל: "אקסטרייל",
  פסאט: "פאסאט",
  גטה: "ג'טה",
  איביזה: "איביזה",
  one: "ONE",
  One: "ONE",
  "Fortwo 2": "Fortwo",
  Fortwo: "Fortwo",
  "פורטו": "Fortwo",

  "ג'וליה": "גוליה",
  גוליה: "גוליה",
  "גרנד וויאג'ר": "גרנד ויאגר",
  "גרנד וויאגר": "גרנד ויאגר",
  "וויאג'ר": "ויאגר",
  וויאגר: "ויאגר",
  "ג'ורני": "גורני",
  "S MAX": "S-MAX",
  "S Max": "S-MAX",
  "רנג'לר": "רנגלר",
  "סד 3": "סדרה 3",
  סד3: "סדרה 3",
  "סד 5": "סדרה 5",
  סד5: "סדרה 5",
  "לג'נד": "לגנד",
  "לנדקרוזר פראדו": "לנד קרוזר פראדו",
  "C HR": "C-HR",
  "CH R": "C-HR",
  CHR: "C-HR",
  CT200H: "CT200h",
  "IS 250": "IS250",
  "LS 460": "LS460",
  "NX 300": "NX300",
  "RX 300": "RX300",
  "RX 450": "RX450",
  "BT 50": "BT-50",
  BT50: "BT-50",
  "CX 3": "CX-3",
  CX3: "CX-3",
  "CX 30": "CX-30",
  CX30: "CX-30",
  "CX 5": "CX-5",
  CX5: "CX-5",
  "MX 5": "MX-5",
  MX5: "MX-5",
  "אטראז'": "אטראז",
  "ג'מפי": "גמפי",
  גמפי: "גמפי",
  "ג'וגר": "גוגר",
  "לודג'י": "לודג'י",
  לודגי: "לודג'י",
  "קדג'אר": "קדג'אר",
  קדגאר: "קדג'אר",
  "קפצ'ור": "קפצ'ור",
  קפצור: "קפצ'ור",

  "ג'וק": "ג'וק",
  גוק: "ג'וק",
  "C4 ספייסטורר": "C4 ספייס טורר",
  "סנצ'ורי": "סנצ'ורי",
  סנצורי: "סנצ'ורי",
  "גמפי 2 0 HDI": "גמפי 2.0 HDI",
  "גמפי 2 0HDI": "גמפי 2.0 HDI",
  "סיד 1 6 D": "סיד 1.6 D",
  "סיד 1 6D": "סיד 1.6 D",
  ספורטאג: "ספורטאג",
  "ספורטאג'": "ספורטאג",

  "ספורטאג'": "ספורטאג",
  "ספורטאז'": "ספורטאג",
  "FR V": "FR-V",
  FRV: "FR-V",
};

/**
 * When fitment/name uses supplier shorthand «אמר» (American mix),
 * map unambiguous model tokens → real make. Otherwise needsReview.
 */
export const AMERICAN_MODEL_MAKE = [
  { re: /סילברדו|טרייל\s*בלייזר|מליבו|קבליר|אקסליד|ספארק|ספרק|סוניק|אוואו|אורלנדו|קרוז(?!ר)|אסטרו|סואנה|ק[אמ]ארו|קמרו|אימפלה|אקווינוקס|טראוורס|בלייזר/i, make: "שברולט" },
  { re: /לקרוס|לה\s*קרוס|לוצרן|לה\s*סייבר/i, make: "ביואיק" },
  { re: /מוסטנג|פוקוס|פיאסטה|אדג|טורנאו|קוריר|F-?150/i, make: "פורד" },
  { re: /ויאגר|גרנד\s*וי[אגי]?ר?|פיטי\s*קרוזר|פיטי\s*קרוז|PT\s*קרוז|300C|\bC300\b|טאון\s*קנטרי/i, make: "קרייזלר" },
  { re: /רנגלר|גרנד\s*צ[׳']?ירוקי|קומפאס|צ'ירוקי/i, make: "ג'יפ" },
  { re: /האמר\s*H|H3\b/i, make: "שברולט" }, // Hummer H3 often under GM/Chevy in IL parts trade; mark review if alone
];

const SMALL_ENGINE_RE =
  /מכסחת|גינון|טרקטורון|אופנוע\s*ים|אופנוע|מנוע\s*קטן|מנועים\s*קטנים|lawn|mower|ATV|jet\s*ski|ים\s*חצי|הנאה\s*ימית/i;

export function isSmallEngineText(fitment, name) {
  return SMALL_ENGINE_RE.test(`${fitment || ""} ${name || ""}`);
}

function stripMarks(s) {
  return String(s || "")
    .replace(/[׳'`״"]/g, (ch) => (ch === "׳" || ch === "'" || ch === "`" ? "'" : ""))
    .replace(/[—–]/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sort aliases longest-first for scanning. */
const ALIASES_SCAN = [...MAKE_ALIASES].sort((a, b) => b[0].length - a[0].length);

export function normalizeMakeToken(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  for (const [alias, canon] of ALIASES_SCAN) {
    if (t === alias || t.startsWith(alias.trimEnd())) return canon;
  }
  return t;
}

export function normalizeModel(make, model) {
  let s = stripMarks(model || "");
  if (!s) return "";
  const mk = stripMarks(make || "");
  if (mk && s.toLowerCase().startsWith(mk.toLowerCase())) {
    s = s.slice(mk.length).trim().replace(/^[,:\-–]+/, "").trim();
  }
  // marketing / junk prefixes
  s = s.replace(/^להט\s+/i, "");
  s = s.replace(/^אמר\s+/i, "");
  // Collapse "קדL" / "קד R" side noise left in model tokens
  s = s.replace(/\s*קד\s*[LR]\b/gi, " ").replace(/\s*אח\s*[LR]\b/gi, " ");
  s = s.replace(/\s+עד\s*(\d{2})\b/gi, " עד $1");
  s = s
    .replace(/שנות ייצור.*$/i, "")
    .replace(/:?\s*שנים:.*$/i, "")
    .replace(/שנתון\s*:.*$/i, "")
    .replace(/משנת.*$/i, "")
    .replace(/\bChevrolet\b.*$/i, "")
    .replace(/\bBMW\b/gi, "")
    .replace(/\s+\d+\.\d+[TDtd]?\s*$/g, " ")
    .replace(/\s+נ?\d+\.\d+\s*$/g, " ")
    .replace(/\s+\d\s+\d\b/g, " ") // "2 0" engine leftovers after decimal strip
    .replace(/\b\d{4}\b/g, " ")
    .replace(/\b(קד|אח|תח|על|דיזל|בנזין|טורבו|היבריד|היברידי|4X4|4X2|אוטומט|ידני|אירדיום|פלטיניום)\b/gi, " ")
    .replace(/\s+[LR]\b/gi, " ")
    .replace(/[-_/.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || /^(גימי|חלק|כללי|universal|שמן מנוע)$/i.test(s)) return "";
  if (/^\d+\.\d+$/.test(s)) return "";
  if (/^[^\p{L}\p{N}]+$/u.test(s)) return ""; // punctuation-only
  if (/^[\u05D0-\u05EA]$/.test(s)) return ""; // lone Hebrew letter
  return MODEL_ALIASES[s] || s;
}

function expand2(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return v >= 50 ? 1900 + v : 2000 + v;
}

export function parseYearsIn(text) {
  let yearFrom = 0;
  let yearTo = 0;
  const bump = (a, b) => {
    if (a < 1950 || a > 2035 || b < 1950 || b > 2035) return;
    if (!yearFrom || a < yearFrom) yearFrom = a;
    if (b > yearTo) yearTo = b;
  };
  const t = String(text || "");
  for (const m of t.matchAll(/((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2})/g)) {
    bump(Number(m[1]), Number(m[2]));
  }
  for (const m of t.matchAll(/מ\s*(\d{2})(?:\s*עד\s*(\d{2}))?/g)) {
    const a = expand2(m[1]);
    const b = m[2] ? expand2(m[2]) : a;
    bump(a, b);
  }
  if (!yearFrom) {
    const single = t.match(/\b((?:19|20)\d{2})\b/);
    if (single) bump(Number(single[1]), Number(single[1]));
  }
  if (yearFrom && !yearTo) yearTo = yearFrom;
  return { yearFrom, yearTo };
}

function preprocess(text) {
  let s = String(text || "");
  for (const [re, he] of EN_BRAND) s = s.replace(re, he);
  // Drop OE / supplier cross-ref tails that poison make scanning
  s = s.split(/מספר חלק|מספר חלופי|BERU|OSSCA|CHAMPION|BOSCH|NGK|ACDelco|BLUE PRINT|דגם מנוע:/i)[0];
  return s;
}

/** Expand supplier name abbreviations (מצת פור / טוי / יונ …) at the start of the name. */
const NAME_ABBREV = [
  [/^מצת\s+הונ\s+/i, "מצת הונדה "],
  [/^מצת\s+דהט\s+/i, "מצת דייהטסו "],
  [/^מצת\s+פור\s+/i, "מצת פורד "],
  [/^מצת\s+טוי\s+/i, "מצת טויוטה "],
  [/^מצת\s+יונ\s+/i, "מצת יונדאי "],
  [/^מצת\s+ניס\s+/i, "מצת ניסאן "],
  [/^מצת\s+פגו\s+/i, "מצת פיג'ו "],
  [/^מצת\s+מזד\s+/i, "מצת מאזדה "],
  [/^מצת\s+מיצ\s+/i, "מצת מיצובישי "],
  [/^מצת\s+מרצ\s+/i, "מצת מרצדס "],
  [/^מצת\s+סאנ\s+/i, "מצת סאנגיונג "],
  [/^מצת\s+סוב\s+/i, "מצת סובארו "],
  [/^מצת\s+סקו\s+/i, "מצת סקודה "],
  [/^מצת\s+פול\s+/i, "מצת פולקסווגן "],
  [/^מצת\s+פיא\s+/i, "מצת פיאט "],
  [/^מצת\s+יגו\s+/i, "מצת יגואר "],
  [/^מצת\s+במו\s+/i, "מצת ב.מ.וו "],
  [/^מצת\s+ולו\s+/i, "מצת וולוו "],
  [/^מצת\s+אלפ\s+/i, "מצת אלפא רומיאו "],
  [/^מצת\s+להט\s+פור\s+/i, "מצת פורד "],
  [/^מצת\s+להט\s+פגו\s+/i, "מצת פיג'ו "],
  [/^מצת\s+להט\s+יונ\s+/i, "מצת יונדאי "],
  [/^מצת\s+להט\s+מיצ\s+/i, "מצת מיצובישי "],
  [/^מצת\s+להט\s+מרצ\s+/i, "מצת מרצדס "],
  [/^מצת\s+להט\s+פול\s+/i, "מצת פולקסווגן "],
  [/^מצת\s+להט\s+פיא\s+/i, "מצת פיאט "],
  [/^מצת\s+להט\s+סאנ\s+/i, "מצת סאנגיונג "],
  [/^מצת\s+אמר\s+פור\s+/i, "מצת אמר פורד "],
];

function expandNameAbbrevs(name) {
  let s = String(name || "");
  for (const [re, to] of NAME_ABBREV) s = s.replace(re, to);
  return s;
}

function isJunkModel(model) {
  const m = String(model || "").trim();
  if (!m) return true;
  if (/\d{5,}/.test(m)) return true; // part-number-ish
  if ((m.match(/\d/g) || []).length >= 6) return true;
  if (/^(MS|Z2|WR|U|BOSCH|NGK|ACDelco)\b/i.test(m)) return true;
  // Product-name leftovers mistaken as models (shock/brake/filter/light rows)
  if (/^(?:ת\.?|נ\.?|צ\.?|ר\.?|מ\.?|פ\.?|ז\.?)?\s*(?:בולם|בלם|נאבה|פרונט|פנס|פילטר|מצת|מדחס|מעבה|רפיד|דיסק|חיישן|סליל|גומי|מצמד)/.test(m)) return true;
  if (/אמר/.test(m) && /(?:בלם|בולם|נאבה|פרונט|מצמד|שמן|פילטר|מצת)/.test(m)) return true;
  // Too many tokens usually means unsplit multi-vehicle / title dump
  if (m.split(/\s+/).length >= 6) return true;
  return false;
}

function findMakeHits(text) {
  const hits = [];
  const used = new Array(text.length).fill(false);
  for (const [alias, canon] of ALIASES_SCAN) {
    let from = 0;
    while (from < text.length) {
      const idx = text.indexOf(alias, from);
      if (idx === -1) break;
      const end = idx + alias.length;
      let overlap = false;
      for (let i = idx; i < end; i++) if (used[i]) { overlap = true; break; }
      if (!overlap) {
        for (let i = idx; i < end; i++) used[i] = true;
        hits.push({ idx, end, make: canon, aliasLen: alias.length });
      }
      from = idx + 1;
    }
  }
  hits.sort((a, b) => a.idx - b.idx || b.aliasLen - a.aliasLen);
  return hits;
}

function modelFromSegment(make, segment) {
  let rest = segment.replace(/^[\s,.:\-–]+/, "");
  // cut at year / displacement / engine code patterns
  const cut = rest.split(/,(?:19|20)\d{2}|מ\s*\d{2}|(?:19|20)\d{2}\s*[-–]|סמ"?ק|\d{4,5}\s*סמ|נפח|דגם מנוע|מנוע\s*:/i)[0] || "";
  let model = cut.replace(/\s+/g, " ").trim();
  if (model.length > 48) model = model.slice(0, 48).trim();
  return normalizeModel(make, model);
}

function resolveAmerican(segment, name) {
  const hay = `${segment} ${name || ""}`;
  const hits = AMERICAN_MODEL_MAKE.filter((x) => x.re.test(hay));
  const makes = [...new Set(hits.map((h) => h.make))];
  if (makes.length === 1) return { make: makes[0], needsReview: false };
  return { make: "", needsReview: true, reason: "אמר-ambiguous" };
}

/**
 * Parse all vehicle fitments from free text.
 * @returns {{ fitments: {make:string,model:string,yearFrom:number,yearTo:number}[], needsReview: string[], smallEngine: boolean }}
 */
export function parseFitments(vehicleFitment, name, { enabled = true } = {}) {
  const needsReview = [];
  const smallEngine = isSmallEngineText(vehicleFitment, name);
  if (smallEngine) {
    return { fitments: [], needsReview, smallEngine: true };
  }
  if (!enabled) {
    return { fitments: [], needsReview, smallEngine: false };
  }

  const fitRaw = preprocess(vehicleFitment || "");
  const nameRaw = preprocess(expandNameAbbrevs(name || ""));
  // Avoid treating «סמארט פור Fortwo» as Ford
  const fitSafe = fitRaw.replace(/סמארט\s+פור\s+/g, "סמארט ").replace(/סמרט\s+פור\s+/g, "סמארט ");
  const hay = `${fitSafe} ${nameRaw}`.trim();
  if (!hay) return { fitments: [], needsReview, smallEngine: false };

  const hasAmar = /(?:^|[\s,])אמר(?:\s|$)/.test(hay) || /מצת אמר/.test(nameRaw);

  const hits = findMakeHits(fitSafe.length ? fitSafe : hay);
  const fitments = [];
  const seen = new Set();

  const push = (make, model, yf, yt) => {
    if (!make) return;
    let md = normalizeModel(make, model);
    if (isJunkModel(md)) md = "";
    // Skip empty-model entries when we will likely get a better one; still allow make-only if nothing else
    const key = `${make}\t${md}`;
    if (seen.has(key)) {
      // merge years
      const existing = fitments.find((f) => f.make === make && f.model === md);
      if (existing && yf) {
        if (!existing.yearFrom || yf < existing.yearFrom) existing.yearFrom = yf;
        if (yt > (existing.yearTo || 0)) existing.yearTo = yt;
      }
      return;
    }
    seen.add(key);
    fitments.push({
      make,
      model: md,
      yearFrom: yf || 0,
      yearTo: yt || yf || 0,
    });
  };

  if (hits.length) {
    for (let i = 0; i < hits.length; i++) {
      const h = hits[i];
      const next = hits[i + 1];
      const source = fitSafe.length ? fitSafe : hay;
      const segment = source.slice(h.end, next ? next.idx : source.length);
      const { yearFrom, yearTo } = parseYearsIn(segment) || parseYearsIn(source.slice(Math.max(0, h.idx - 5), next ? next.idx : h.end + 80));
      let model = modelFromSegment(h.make, segment);
      // Xantia mis-tagged under BMW in some rows — if model is קסנטיה force Citroen
      if (h.make === "ב.מ.וו" && /קסנטיה/i.test(segment + model)) {
        push("סיטרואן", "קסנטיה", yearFrom, yearTo);
        continue; // reassigned Citroen Xantia; not ambiguous
      }
      push(h.make, model || "", yearFrom, yearTo);
    }
  }

  // Abbreviation-only short fitments: scan name when few/no hits from fitment
  if (!fitments.length) {
    const nameHits = findMakeHits(nameRaw);
    for (let i = 0; i < nameHits.length; i++) {
      const h = nameHits[i];
      const next = nameHits[i + 1];
      const segment = nameRaw.slice(h.end, next ? next.idx : nameRaw.length);
      const { yearFrom, yearTo } = parseYearsIn(segment) || parseYearsIn(nameRaw);
      push(h.make, modelFromSegment(h.make, segment), yearFrom, yearTo);
    }
  }

  // «אמר» handling — only invent a vehicle when none were parsed from explicit makes.
  // Product titles like «צ.בלם אמר C300» must not become the model when VF already lists makes.
  if (hasAmar) {
    const resolved = resolveAmerican(fitRaw || hay, nameRaw);
    const haveModel = fitments.some((f) => f.model);
    if (resolved.make && !haveModel) {
      const { yearFrom, yearTo } = parseYearsIn(fitRaw || hay);
      const amarSource = /אמר/.test(fitRaw) ? fitRaw : /אמר/.test(nameRaw) ? nameRaw : hay;
      const after = amarSource.split(/אמר/).slice(1).join(" ") || "";
      const strippedName = nameRaw
        .replace(/^(?:ת\.?|נ\.?|צ\.?|ר\.?|מ\.?|פ\.?|ז\.?)?\s*(?:בולם|בלם|נאבה|פרונט|פנס|פילטר|מצת|מדחס|מעבה|רפיד|דיסק|גומי|מצמד|שמן)?\s*אמר\s*/i, "")
        .replace(/^מצת\s*אמר\s*/i, "");
      let model = modelFromSegment(resolved.make, after) || modelFromSegment(resolved.make, strippedName);
      if (model && isJunkModel(model)) model = "";
      push(resolved.make, model, yearFrom, yearTo);
    } else if (!resolved.make && !fitments.length) {
      // Multi-brand American mix with no parseable vehicles — leave for review
      needsReview.push(resolved.reason || "אמר-ambiguous");
    }
    // If fitments already exist from explicit makes in the text, keep them; no review flag.
  }

  // Genesis / Smart already canonical via aliases when text contains them

  const makesWithModel = new Set(fitments.filter((f) => f.model).map((f) => f.make));
  const cleaned = fitments.filter((f) => {
    if (!f.make) return false;
    if (!f.model && makesWithModel.has(f.make)) return false;
    if (f.model && isJunkModel(f.model)) return false;
    return true;
  });
  // Dedupe English/Hebrew twin models (Edge vs אדג')
  const out = [];
  const seen2 = new Set();
  for (const f of cleaned) {
    const k = `${f.make}\t${f.model}`.toLowerCase();
    if (seen2.has(k)) continue;
    seen2.add(k);
    out.push(f);
  }
  return { fitments: out, needsReview, smallEngine: false };
}

/** Legacy single make/model for non-normalized categories (improved aliases only). */
export function parseMakeModelLegacy(fit, name) {
  const hay = preprocess(`${fit || ""} ${name || ""}`);
  let make = "";
  let at = -1;
  let aliasLen = 0;
  for (const [alias, canonical] of ALIASES_SCAN) {
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
    model = normalizeModel(make, token);
  }
  return { make, model };
}
