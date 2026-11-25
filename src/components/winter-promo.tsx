import { Link } from "@tanstack/react-router";
import { useCatalogOverlayRev } from "@/components/catalog-overlay-sync";
import {
  promoCountdown,
  WINTER_BUNDLE_BADGE,
  winterBundlesForSku,
  winterPromo,
  bundleTotal,
} from "@/lib/winter-bundles";
import { formatCatalogPrice } from "@/lib/prices";
import { getProductTags } from "@/lib/product-tags";
import { useNowTick, useWinterPromoActive } from "@/components/use-winter-promo";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function WinterCountdown({ compact = false }: { compact?: boolean }) {
  const now = useNowTick();
  const c = now ? promoCountdown(now) : null;
  const cells: Array<[string, string]> = [
    [c ? pad2(c.days) : "--", "ימים"],
    [c ? pad2(c.hours) : "--", "שעות"],
    [c ? pad2(c.minutes) : "--", "דקות"],
  ];
  return (
    <div
      className="winter-countdown mt-3 flex gap-1.5"
      aria-label="זמן שנשאר עד סוף יום שישי 27.11"
      suppressHydrationWarning
    >
      {cells.map(([v, label]) => (
        <div key={label} className="winter-cd flex-1 rounded-[10px] text-center">
          <b className={compact ? "text-lg" : "text-xl"} suppressHydrationWarning>
            {v}
          </b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Home banner. Renders nothing outside the configured window or when enabled=false. */
export function WinterPromoBanner() {
  const active = useWinterPromoActive();
  if (!active) return null;
  return (
    <section className="px-3.5 pt-3.5 md:px-5" aria-label={winterPromo.title}>
      <div className="winter-banner mx-auto max-w-[720px] rounded-2xl px-4 pt-4 pb-3.5 text-white">
        <p className="text-[11px] font-bold text-[#ffb4a0]">{winterPromo.kicker}</p>
        <h2 className="text-[26px] leading-tight font-extrabold tracking-tight">
          {winterPromo.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-snug text-white/85">
          {winterPromo.subtitle}.
          <br />
          חבילות לקורולה, <bdi>i10</bdi> ו־<bdi>D-Max</bdi> · עד יום שישי 27.11
        </p>
        <WinterCountdown />
        <Link
          to="/winter-bundles"
          className="mt-3 block rounded-[10px] bg-accent px-3.5 py-2.5 text-center text-sm font-extrabold text-on-accent hover:bg-accent-hot"
        >
          לחבילות טיפול חורף
        </Link>
      </div>
    </section>
  );
}

/** Photo badge for bundle members. Skips the photo slot when two admin tags already occupy both corners. */
export function WinterBundlePhotoBadge({ sku }: { sku: string }) {
  useCatalogOverlayRev();
  const active = useWinterPromoActive();
  if (!active || !winterBundlesForSku(sku).length) return null;
  const tags = getProductTags(sku);
  if (tags.length >= 2) return null;
  return <span className="product-img-tag winter-badge tl">{WINTER_BUNDLE_BADGE}</span>;
}

/** One-line note under the price linking to the bundles page. */
export function WinterBundleNote({ sku, className }: { sku: string; className?: string }) {
  useCatalogOverlayRev();
  const active = useWinterPromoActive();
  if (!active) return null;
  const bundles = winterBundlesForSku(sku);
  if (!bundles.length) return null;
  return (
    <div className={className ? `flex flex-col gap-1 ${className}` : "flex flex-col gap-1"}>
      {bundles.map((b) => {
        const total = bundleTotal(b);
        return (
          <Link
            key={b.id}
            to="/winter-bundles"
            hash={b.id}
            className="block rounded-lg bg-accent/10 px-2.5 py-1.5 text-[12px] font-bold text-accent-hot hover:underline"
          >
            {WINTER_BUNDLE_BADGE} ל{b.shortVehicle}
            {total != null ? (
              <>
                {" "}
                · <bdi>{formatCatalogPrice(total)}</bdi> לכל החבילה
              </>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
