/** Explicit vocabulary, not destructive Hebrew suffix stripping (never touches SKU/OE). */
const groups = [
  ["תוסף", "תוספים", "תוספי", "additive", "additives"],
  ["שמן", "שמנים", "שמני", "oil", "oils"],
  ["מסנן", "מסננים", "מסנני", "פילטר", "פילטרים", "פילטרי", "filter", "filters"],
  ["דלק", "fuel"],
  ["סולר", "diesel"],
  ["בנזין", "benzin", "petrol", "gasoline"],
  ["מנוע", "מנועים", "engine", "motor"],
  ["ניקוי", "cleaner", "cleaning"],
];
const canonical = new Map(
  groups.flatMap((group) => group.map((word) => [word, group[0]] as const)),
);
const words = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu) || [];
export function languageMatches(title: string, original: string, category: string, query: string) {
  const needles = words(query).filter((w) => !["לרכב", "למכונית", "לרכבים", "של"].includes(w));
  if (!needles.some((w) => canonical.has(w))) return false;
  const hay = new Set(words(title + " " + original).map((w) => canonical.get(w) || w));
  if (category === "additives") hay.add("תוסף");
  return needles.every((w) => hay.has(canonical.get(w) || w));
}
export const VEHICLE_OPTIONAL_CATEGORIES = [
  "fluids",
  "additives",
  "cleaning-maintenance",
  "workshop-packs",
];
