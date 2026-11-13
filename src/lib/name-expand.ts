import nameAbbr from "../../public/catalog/name-abbreviations.json" with { type: "json" };

type Rule = { abbr: string; full: string; mode: "literal" | "token" };

const rules = (nameAbbr as { rules?: Rule[] }).rules ?? [];
const HE = "\\u0590-\\u05FF";

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Expand high-confidence abbreviations for display. Keeps original when unchanged. */
export function expandProductName(name: string): { name: string; nameOriginal?: string; changed: boolean } {
  const original = String(name || "");
  if (!original) return { name: "", changed: false };
  let out = original;
  for (const rule of rules) {
    if (!rule?.abbr || !rule?.full) continue;
    if (rule.mode === "token") {
      const re = new RegExp(`(?<![${HE}])${escapeReg(rule.abbr)}(?![${HE}])`, "g");
      out = out.replace(re, rule.full);
    } else if (out.includes(rule.abbr)) {
      out = out.split(rule.abbr).join(rule.full);
    }
  }
  out = out.replace(/\s+/g, " ").trim();
  if (out === original) return { name: original, changed: false };
  return { name: out, nameOriginal: original, changed: true };
}
