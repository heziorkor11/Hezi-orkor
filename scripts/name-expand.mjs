/**
 * Expand high-confidence Hebrew catalog abbreviations for display names.
 * Source of truth: public/catalog/name-abbreviations.json
 * Does not touch SKU / prices / xlsx.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DICT_PATH = join(ROOT, "public", "catalog", "name-abbreviations.json");

/** @type {{abbr:string, full:string, mode:'literal'|'token'}[]} */
let rules = [];
try {
  if (existsSync(DICT_PATH)) {
    const raw = JSON.parse(readFileSync(DICT_PATH, "utf8"));
    rules = Array.isArray(raw?.rules) ? raw.rules : [];
  }
} catch {
  rules = [];
}

const HE = "\\u0590-\\u05FF";

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param {string} name
 * @returns {{ name: string, nameOriginal: string | undefined, changed: boolean }}
 */
export function expandProductName(name) {
  const original = String(name || "");
  if (!original) return { name: "", nameOriginal: undefined, changed: false };
  let out = original;
  for (const rule of rules) {
    const abbr = rule.abbr;
    const full = rule.full;
    if (!abbr || !full) continue;
    if (rule.mode === "token") {
      const re = new RegExp(`(?<![${HE}])${escapeReg(abbr)}(?![${HE}])`, "g");
      out = out.replace(re, full);
    } else {
      // literal substring replace (abbreviations include dots / apostrophes)
      if (out.includes(abbr)) out = out.split(abbr).join(full);
    }
  }
  // collapse leftover double spaces
  out = out.replace(/\s+/g, " ").trim();
  if (out === original) return { name: original, nameOriginal: undefined, changed: false };
  return { name: out, nameOriginal: original, changed: true };
}

export function getNameExpandRules() {
  return rules;
}
