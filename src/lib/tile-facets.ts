/** Facets used by category photo tiles. Parsed from titles only — never invented. */

const ENGINE_VISCOSITY_RE =
  /\b(0|5|10|15|20)\s*W\s*-?\s*(8|12|16|20|30|40|50|60)\b/i;

const FRONT_RE = /קדמי|קד['׳]/;
const REAR_RE = /אחורי|אח['׳]/;

/** Known engine-oil grades only, so gear oils like 75W-90 and model-number false hits stay out. */
export function parseViscosity(title: string): string | undefined {
  const m = ENGINE_VISCOSITY_RE.exec(title || "");
  if (!m) return undefined;
  return `${m[1]}W-${m[2]}`.replace(/w/i, "W");
}

export function matchAxle(title: string): "front" | "rear" | undefined {
  const t = title || "";
  const front = FRONT_RE.test(t);
  const rear = REAR_RE.test(t);
  if (front && rear) return undefined;
  if (front) return "front";
  if (rear) return "rear";
  return undefined;
}

/**
 * Left/right from explicit title tokens (L / R / שמאל / ימין).
 * Ignores RAV4 and CR-V, which would otherwise look like an R.
 */
export function matchHand(title: string): "left" | "right" | undefined {
  const cleaned = (title || "").replace(/RAV4/gi, " ").replace(/CR[\s-]?V\b/gi, " ");
  const tokens = cleaned.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const left = tokens.includes("L") || tokens.includes("שמאל");
  const right = tokens.includes("R") || tokens.includes("ימין");
  if (left && right) return undefined;
  if (left) return "left";
  if (right) return "right";
  return undefined;
}

export const AXLE_LABELS: Record<"front" | "rear", string> = {
  front: "קדמי",
  rear: "אחורי",
};

export const HAND_LABELS: Record<"left" | "right", string> = {
  left: "שמאל",
  right: "ימין",
};
