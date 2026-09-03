/**
 * Read the public catalog sheet (לאתר) from the Hezi master xlsx.
 * exceljs crashes on drawings in this workbook, so we parse OOXML directly.
 * Never returns the מחיר column or any other non-public sheet.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PUBLIC_SHEET_NAME = "לאתר";

const XLSX_CANDIDATES = [
  join(ROOT, "artifacts", "Hezi_Master_Catalog.xlsx"),
  join(ROOT, "artifacts", "hezi-catalog", "incoming", "Hezi_Master_Catalog.xlsx"),
];

export function findCatalogXlsx() {
  return XLSX_CANDIDATES.find((p) => existsSync(p)) ?? null;
}

function decodeXml(text) {
  return String(text)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cellValue(inner, t) {
  if (t === "inlineStr" || inner.includes("<is")) {
    const texts = [...inner.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => decodeXml(m[1]));
    return texts.join("");
  }
  const v = inner.match(/<v[^>]*>([^<]*)<\/v>/);
  return v ? decodeXml(v[1]) : "";
}

function parseSheetXml(xml) {
  const rows = [];
  const rowRe = /<row r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRe.exec(xml))) {
    const cells = {};
    const inner = rowMatch[2];
    const cellRe = /<c r="([A-Z]+)(\d+)"([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch;
    while ((cellMatch = cellRe.exec(inner))) {
      const col = cellMatch[1];
      const attrs = cellMatch[3] || "";
      const body = cellMatch[4] || "";
      const t = (attrs.match(/\st="([^"]+)"/) || [])[1] || "";
      cells[col] = cellValue(body, t);
    }
    rows.push({ r: Number(rowMatch[1]), cells });
  }
  return rows;
}

function workbookSheetPath(wbXml, relsXml, sheetName) {
  const sheetRe =
    /<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"|<sheet[^>]*r:id="([^"]+)"[^>]*name="([^"]+)"/g;
  let m;
  let rid = null;
  while ((m = sheetRe.exec(wbXml))) {
    const name = m[1] || m[4];
    const id = m[2] || m[3];
    if (name === sheetName) {
      rid = id;
      break;
    }
  }
  if (!rid) return null;
  const relRe = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"|<Relationship[^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g;
  let rel;
  while ((rel = relRe.exec(relsXml))) {
    const id = rel[1] || rel[4];
    const target = rel[2] || rel[3];
    if (id === rid) {
      const cleaned = target.replace(/^\/?xl\//, "").replace(/^\//, "");
      return cleaned.startsWith("worksheets/") ? `xl/${cleaned}` : `xl/${cleaned}`;
    }
  }
  return null;
}

function normHeader(h) {
  return String(h || "")
    .replace(/[\u05F4\u05F3"״׳']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function mapHeaders(headerCells) {
  const map = {};
  for (const [col, raw] of Object.entries(headerCells)) {
    const h = normHeader(raw);
    if (!h) continue;
    if (h.includes("מקט") && (h.includes("יצרן") || h.toLowerCase().includes("oe"))) map.oe = col;
    else if (h.includes("מקט")) map.sku = col;
    else if (h.includes("שם מוצר") || h === "שם") map.name = col;
    else if (h.includes("קטגוריה")) map.category = col;
    else if (h.includes("התאמה")) map.fitment = col;
    else if (h.includes("תיאור")) map.description = col;
    else if (h.includes("מחיר") || h.includes("עלות") || /price|cost/i.test(h)) {
      map.price = col; // recorded only so we can skip it
    }
  }
  return map;
}

function emptyish(value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "nan" || lower === "none" || lower === "null" || lower === "undefined") return "";
  return s;
}

/**
 * @returns {Promise<{ sheetName: string, xlsxPath: string, headers: Record<string,string>, rows: {sku:string,name:string,category:string,vehicleFitment:string,oe:string,description:string}[], dataRowCount: number }>}
 */
export async function readPublicCatalogRows(xlsxPath = findCatalogXlsx()) {
  if (!xlsxPath) {
    throw new Error("Hezi_Master_Catalog.xlsx not found under artifacts/");
  }
  const zip = await JSZip.loadAsync(await readFile(xlsxPath));
  const wbXml = await zip.file("xl/workbook.xml").async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");
  const sheetPath = workbookSheetPath(wbXml, relsXml, PUBLIC_SHEET_NAME);
  if (!sheetPath || !zip.file(sheetPath)) {
    const names = [...wbXml.matchAll(/name="([^"]+)"/g)].map((x) => x[1]);
    throw new Error(`Sheet ${PUBLIC_SHEET_NAME} not found. Sheets: ${names.join(", ")}`);
  }
  const xml = await zip.file(sheetPath).async("string");
  const parsed = parseSheetXml(xml);
  if (!parsed.length) throw new Error("Public sheet is empty");
  const header = parsed[0];
  const colMap = mapHeaders(header.cells);
  if (!colMap.sku || !colMap.name) {
    throw new Error(`Missing מק״ט / שם מוצר headers. Got: ${JSON.stringify(header.cells)}`);
  }
  const rows = [];
  let dataRowCount = 0;
  for (const row of parsed.slice(1)) {
    const sku = emptyish(row.cells[colMap.sku]);
    const name = emptyish(row.cells[colMap.name]);
    const hasAny = Object.values(row.cells).some((v) => emptyish(v));
    if (!hasAny) continue;
    dataRowCount += 1;
    if (!sku || !name) continue;
    rows.push({
      sku,
      name,
      category: emptyish(colMap.category ? row.cells[colMap.category] : ""),
      vehicleFitment: emptyish(colMap.fitment ? row.cells[colMap.fitment] : ""),
      oe: emptyish(colMap.oe ? row.cells[colMap.oe] : ""),
      description: emptyish(colMap.description ? row.cells[colMap.description] : ""),
    });
  }
  return {
    sheetName: PUBLIC_SHEET_NAME,
    xlsxPath,
    headers: header.cells,
    rows,
    dataRowCount,
  };
}
