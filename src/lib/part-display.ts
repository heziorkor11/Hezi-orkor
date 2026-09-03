/** Display helpers for messy supplier catalog rows. Do not invent fitment. */

const AFTERMARKET = new Set(
  "BOGE BILSTEIN SACHS MONROE TRW KYB OPTIMAL MEYLE OCAP ACDELCO ASHIKA SIDAT LEMFORDER SKF MOOG FEBI GATES BOSCH NGK MANN MAHLE VALEO DELPHI BENDIX TEXTAR ATE BREMBO EURO EUROMASTER SPEEDMATE GKN LUK INA FAG SNR NTN NSK JAPANPARTS NIPPARTS BLUEPRINT HOFFER INTERMOTOR".split(
    " ",
  ),
);

const CAR_LABEL = /^(אופל|שברולט|אאודי|פולקסווגן|סקודה|סיאט|פורשה|למבורגיני|בנטלי|טויוטה|לקסוס|הונדה|ניסאן|מאזדה|מיצובישי|סוזוקי|סובארו|קיה|יונדאי|ב.מ.וו|במוו|מרצדס|וולוו|פיג'ו|פיג׳ו|סיטרואן|רנו|דאצ'יה|דאצ׳יה|פורד|ג'יפ|ג׳יפ|קרייזלר|דודג'|דודג׳|פיאט|אלפא|לנצ'יה|לנצ׳יה|יגואר|לנדרובר|מיני|סמארט|טסלה|ביואיק|קדילאק|GMC|אופל)$/i;

const NAME_CATEGORY: Array<[RegExp, string]> = [
  [/בולם/, "shocks"],
  [/פנס אחור|פנס אח/, "lights"],
  [/פנס ערפל/, "lighting"],
  [/פנס/, "lights"],
  [/מדחס/, "ac-compressor"],
  [/מעבה/, "ac-condenser"],
  [/פילטר שמן|מסנן שמן/, "oil-filter"],
  [/פילטר מזגן|מסנן מזגן|פילטר תא/, "cabin-filter"],
  [/פילטר|מסנן/, "filters"],
  [/רפיד|דיסק בלם|בלם/, "brakes"],
  [/רדיאטור/, "radiator"],
  [/חיישן|חמצן|\\bO2\\b/, "sensors"],
  [/מצת/, "spark-plugs"],
  [/סליל/, "ignition-coils"],
  [/שמן|נוזל|אנטיפריז|antifreeze/i, "fluids"],
  [/מראה/, "mirrors"],
];

export function inferCategory(name: string, fallback = "general") {
  const n = name || "";
  for (const [re, id] of NAME_CATEGORY) if (re.test(n)) return id;
  return fallback || "general";
}

function expandYear(two: string) {
  const n = Number(two);
  if (!Number.isFinite(n)) return 0;
  return n >= 90 ? 1900 + n : 2000 + n;
}

export function yearsFromTitle(title?: string): { from: number; to: number } | null {
  const s = title || "";
  const range = s.match(/מ\\s*-?\\s*(\\d{2})\\s*עד\\s*-?\\s*(\\d{2})/);
  if (range) {
    const from = expandYear(range[1]);
    const to = expandYear(range[2]);
    if (from && to && from <= to && to - from <= 12) return { from, to };
  }
  const single = s.match(/מ\\s*-?\\s*(\\d{2})(?!\\s*עד)/);
  if (single) {
    const from = expandYear(single[1]);
    if (from) return { from, to: from };
  }
  return null;
}

export function displayYears(name: string, yearFrom?: number, yearTo?: number) {
  const named = yearsFromTitle(name);
  if (named) return named.from === named.to ? String(named.from) : `${named.from}–${named.to}`;
  if (!yearFrom) return "";
  const span = (yearTo || yearFrom) - yearFrom;
  if (span > 10) return `${yearFrom}–${yearTo || yearFrom} · יש לאשר לפי הרכב`;
  return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
}

export function yearBounds(name: string, yearFrom?: number, yearTo?: number) {
  const named = yearsFromTitle(name);
  if (named) return named;
  if (yearFrom) return { from: yearFrom, to: yearTo || yearFrom };
  return null;
}

export type OeSplit = { oem: string[]; aftermarket: string[] };

export function splitOe(raw?: string): OeSplit {
  const oem: string[] = [];
  const aftermarket: string[] = [];
  let bucket: "oem" | "after" = "oem";
  const seen = new Set<string>();
  for (const tok of (raw || "").split(/[\\s,;|/]+/).map((t) => t.trim()).filter(Boolean)) {
    const key = tok.toUpperCase();
    if (CAR_LABEL.test(tok)) continue;
    if (AFTERMARKET.has(key.replace(/[^A-Z0-9]/g, ""))) {
      bucket = "after";
      continue;
    }
    if (!/[0-9]/.test(tok) || tok.length < 4) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    (bucket === "oem" ? oem : aftermarket).push(tok);
  }
  return { oem, aftermarket };
}

export function primaryOeLine(raw?: string, limit = 6) {
  const { oem, aftermarket } = splitOe(raw);
  const list = oem.length ? oem : aftermarket.slice(0, limit);
  if (!list.length) return "";
  const shown = list.slice(0, limit);
  const extra = list.length - shown.length;
  return extra > 0 ? `${shown.join(" · ")} ועוד ${extra}` : shown.join(" · ");
}

export function oeSearchTokens(raw?: string) {
  const { oem, aftermarket } = splitOe(raw);
  return [...oem, ...aftermarket].map((t) => t.toLowerCase());
}

export function imageLooksLikeSharedOe(image?: string, oe?: string) {
  if (!image) return false;
  if (image.startsWith("/products/")) return true;
  const m = image.match(/(\d{5,8})\.(?:jpe?g|png|webp)(?:\?|$)/i);
  if (!m) return false;
  return (oe || "").includes(m[1]);
}
