/**
 * Curated home carousels. A dashboard picker writes public/catalog/home-deals-overrides.json.
 */
import dealsOverrides from "../../public/catalog/home-deals-overrides.json" with { type: "json" };
import { overlayHomeDeals } from "@/lib/admin/public-overlay";

export const defaultHomeDealsSkus = [
  "HZ-BRK-00248",
  "HZ-BRK-00680",
  "HZ-BRK-00449",
  "HZ-CMP-00014",
  "HZ-CMP-00047",
  "HZ-OIL-00011",
  "HZ-GEN-04977",
  "HZ-CND-00001",
] as const;

const fileSkus = (dealsOverrides as { skus?: string[] }).skus;

export const homeDealsSkus = (
  fileSkus?.length ? fileSkus : [...defaultHomeDealsSkus]
) as string[];

export function currentHomeDealsSkus(): string[] {
  return overlayHomeDeals(homeDealsSkus);
}

/** Recommended rail — overlapping but distinct order from deals. */
export const homeRecommendedSkus = [
  "HZ-GEN-01392",
  "HZ-GEN-01393",
  "HZ-GEN-02141",
  "HZ-GEN-02142",
  "HZ-BRK-00001",
  "HZ-CMP-00014",
  "HZ-OIL-00011",
  "HZ-CND-00001",
] as const;
