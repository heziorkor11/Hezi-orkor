#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "catalog");
const HEBREW = /[\u0590-\u05FF]/;
const REPLACEMENT = "\uFFFD";
const FORBIDDEN = /^(price|originalPrice|originalprice|cost|supplier|מחיר|עלות)$/i;
const PRICEY_KEY = /price|cost|מחיר|עלות|supplier/i;
const errors = [];
const fail = (msg) => errors.push(msg);

function readUtf8(path) {
  const text = readFileSync(path, "utf8");
  if (text.includes(REPLACEMENT)) fail(path + " contains U+FFFD replacement char");
  try { return JSON.parse(text); }
  catch (err) { fail(path + " is not valid JSON: " + err.message); return null; }
}

function walkForbidden(value, where) {
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkForbidden(item, where + "[" + i + "]"));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value)) {
    if ((FORBIDDEN.test(k) || PRICEY_KEY.test(k)) && v != null && v !== "") {
      fail(where + " has forbidden key " + k + "=" + JSON.stringify(v));
    }
    walkForbidden(v, where + "." + k);
  }
}

export { ROOT, DIR, HEBREW, fail, errors, readUtf8, walkForbidden };

const chunkDir = join(DIR, "chunks");
const pageDir = join(DIR, "pages");

function loadOrFail(rel) {
  const p = join(DIR, rel);
  if (!existsSync(p)) {
    fail("missing " + rel);
    return null;
  }
  return readUtf8(p);
}

const manifest = loadOrFail("manifest.json");
const index = loadOrFail("search-index.json");
const skuMap = loadOrFail("sku-map.json");
const featured = loadOrFail("featured.json");
if (manifest) walkForbidden(manifest, "manifest");
if (index) walkForbidden(index, "search-index");
if (skuMap) walkForbidden(skuMap, "sku-map");
if (featured) walkForbidden(featured, "featured");
if (!manifest) fail("invalid manifest");
if (!Array.isArray(index)) fail("search-index.json is not an array");
if (!skuMap || typeof skuMap !== "object") fail("sku-map.json is not an object");
if (!Array.isArray(featured)) fail("featured.json is not an array");

const chunkFiles = existsSync(chunkDir)
  ? readdirSync(chunkDir).filter((f) => f.endsWith(".json")).sort()
  : [];
const pageFiles = existsSync(pageDir)
  ? readdirSync(pageDir).filter((f) => f.endsWith(".json")).sort()
  : [];

let chunkSum = 0;
let hebrewHits = 0;
const skus = new Set();
for (const file of chunkFiles) {
  const json = readUtf8(join(chunkDir, file));
  if (!Array.isArray(json)) {
    fail("chunk " + file + " is not an array");
    continue;
  }
  walkForbidden(json, "chunks/" + file);
  chunkSum += json.length;
  for (const rec of json) {
    if (!rec || typeof rec !== "object") continue;
    if (!rec.sku || !String(rec.sku).trim()) fail("chunk " + file + " record missing sku");
    if (!rec.name || !String(rec.name).trim()) fail("chunk " + file + " missing name");
    if (skus.has(rec.sku)) fail("duplicate sku " + rec.sku);
    skus.add(rec.sku);
    const blob = (rec.name || "") + (rec.description || "") + (rec.vehicleFitment || "");
    if (HEBREW.test(blob)) hebrewHits += 1;
  }
}

let pageSum = 0;
for (const file of pageFiles) {
  const json = readUtf8(join(pageDir, file));
  if (!Array.isArray(json)) {
    fail("page " + file + " is not an array");
    continue;
  }
  walkForbidden(json, "pages/" + file);
  pageSum += json.length;
  for (const rec of json) {
    if (!rec || !rec.sku || !rec.name) fail("page " + file + " record missing sku/name");
  }
}
if (index && manifest && index.length !== manifest.total) {
  fail("search-index length " + index.length + " !== manifest.total " + manifest.total);
}
if (manifest && chunkSum !== manifest.total) {
  fail("sum of chunk lengths " + chunkSum + " !== manifest.total " + manifest.total);
}
if (manifest && pageSum !== manifest.total) {
  fail("sum of page lengths " + pageSum + " !== manifest.total " + manifest.total);
}
if (manifest && manifest.chunkCount != null && chunkFiles.length !== manifest.chunkCount) {
  fail("chunk file count " + chunkFiles.length + " !== manifest.chunkCount " + manifest.chunkCount);
}
if (manifest && manifest.pageCount != null && pageFiles.length !== manifest.pageCount) {
  fail("page file count " + pageFiles.length + " !== manifest.pageCount " + manifest.pageCount);
}
if (skuMap && manifest && Object.keys(skuMap).length !== manifest.total) {
  fail("sku-map keys " + Object.keys(skuMap).length + " !== manifest.total " + manifest.total);
}
if (manifest && hebrewHits < Math.min(100, manifest.total)) {
  fail("too few Hebrew samples (" + hebrewHits + ")");
}
if (Array.isArray(index)) {
  for (let i = 0; i < index.length; i += 1) {
    const hit = index[i];
    if (!hit || !hit.sku || !hit.title) fail("search-index[" + i + "] missing sku/title");
  }
}

let xlsxRows = null;
try {
  const { findCatalogXlsx, readPublicCatalogRows } = await import("./latar-xlsx.mjs");
  if (findCatalogXlsx()) {
    const got = await readPublicCatalogRows();
    xlsxRows = { rows: got.rows.length, dataRowCount: got.dataRowCount, sheetName: got.sheetName };
    if (got.sheetName !== "לאתר") fail("expected sheet לאתר, got " + got.sheetName);
    if (manifest && got.rows.length !== manifest.total) {
      fail("xlsx rows " + got.rows.length + " !== manifest.total " + manifest.total);
    }
    if (manifest && got.dataRowCount !== manifest.total) {
      fail("xlsx data rows " + got.dataRowCount + " !== manifest.total " + manifest.total);
    }
  } else {
    console.log("xlsx not present; validating generated JSON only");
  }
} catch (err) {
  console.warn("xlsx re-read skipped:", err.message);
}

if (errors.length) {
  console.error("catalog validation failed (" + errors.length + " issues):");
  for (const e of errors) console.error(" -", e);
  throw new Error("catalog validation failed");
}

console.log(JSON.stringify({
  ok: true,
  total: manifest.total,
  chunks: chunkFiles.length,
  pages: pageFiles.length,
  hebrewHits,
  xlsxRows,
  sheet: manifest.sheet,
}, null, 2));
