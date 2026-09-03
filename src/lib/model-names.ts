/** Clean messy supplier model strings into one customer-facing name. */

const JUNK = /^(שמן מנוע|גימי|חלק|כללי|universal)$/i;

const ALIAS: Record<string, string> = {
  "מאליבו": "מליבו",
  "ויונט": "ויואנט",
  "טרוורס": "טראוורס",
  "טרורס": "טראוורס",
  "טרייל בליזר": "טרייל בלייזר",
  "טריילבלייזר": "טרייל בלייזר",
  "טרילבלייזר": "טרייל בלייזר",
  "ספרק": "ספארק",
  "קמארו": "קמרו",
  "קאמארו": "קמרו",
  "אקיונוקס": "אקווינוקס",
  "וויאגר": "ויאגר",
  "ויאגר": "ויאגר",
  "גרנד וויאגר": "גרנד ויאגר",
  "גרנד ויאגר": "גרנד ויאגר",
  "PT קרוזיר": "PT קרוזר",
  "פיטי קרוזר": "PT קרוזר",
  "גאז": "ג'אז",
  "סיויק": "סיוויק",
  "היילוקס": "היילקס",
  "הילקס": "היילקס",
  "אבנסיס": "אוונסיס",
  "אאוריס": "אוריס",
  "פיריוס": "פריוס",
  "לנדקרוזר": "לנד קרוזר",
  "אינסיט": "אינסייט",
  "איגו": "אייגו",
  "קומפס": "קומפאס",
  "גראנד שירוקי": "גרנד שירוקי",
  "גרנד צירוקי": "גרנד שירוקי",
  "CRV": "CR-V",
  "HRV": "HR-V",
  "FRV": "FR-V",
};

function stripMarks(s: string) {
  return s
    .replace(/[׳'`״"]/g, "")
    .replace(/[—–]/g, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalModel(make: string, model: string): string {
  let s = stripMarks(model || "");
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
    .replace(/[-_/.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!s || JUNK.test(s)) return "";
  return ALIAS[s] || s;
}

export function sameModel(make: string, a?: string, b?: string) {
  const left = canonicalModel(make, a || "");
  const right = canonicalModel(make, b || "");
  if (!left || !right) return false;
  if (left === right) return true;
  return left.includes(right) || right.includes(left);
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
