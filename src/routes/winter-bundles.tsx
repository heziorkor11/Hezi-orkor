import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { WinterCountdown } from "@/components/winter-promo";
import { useWinterPromoActive } from "@/components/use-winter-promo";
import { useCatalogOverlayRev } from "@/components/catalog-overlay-sync";
import { useCart } from "@/lib/cart";
import { loadProductsBySkus, type Product } from "@/lib/catalog";
import { bootAdminOverlay } from "@/lib/admin/boot-overlay";
import { overlayImage, overlayStock } from "@/lib/admin/public-overlay";
import { isOutOfStock } from "@/lib/admin/stock-qty";
import { catalogPrice, formatCatalogPrice, priceOrQuoteLabel } from "@/lib/prices";
import {
  bundleCartAdds,
  bundleTotal,
  visibleWinterBundles,
  winterBundleSkus,
  winterPromo,
  type WinterBundle,
} from "@/lib/winter-bundles";

export const Route = createFileRoute("/winter-bundles")({
  loader: async () => {
    await bootAdminOverlay();
    const products = await loadProductsBySkus(winterBundleSkus());
    return { products };
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-[1180px] px-5 py-16 text-center text-muted">טוען…</div>
  ),
  head: () => ({
    meta: [
      { title: `חבילות טיפול חורף | חזי אורקור | נהריה` },
      {
        name: "description",
        content:
          "חבילות טיפול חורף לקורולה, i10 ו־D-Max: כל הפריטים לטיפול בלחיצה אחת, במחירי האתר.",
      },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: WinterBundlesPage,
});

function WinterBundlesPage() {
  useCatalogOverlayRev();
  const { products } = Route.useLoaderData();
  const active = useWinterPromoActive();
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const bundles = active ? visibleWinterBundles() : [];

  if (!active || !bundles.length) {
    return (
      <div className="mx-auto max-w-[720px] px-3.5 pt-10 pb-16 text-center">
        <h1 className="text-[22px] font-extrabold">חבילות טיפול חורף</h1>
        <p className="mt-2 text-muted">החבילות אינן זמינות כרגע.</p>
        <Link to="/" className="mt-4 inline-block text-accent-hot underline">
          בחזרה לדף הבית
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-3.5 pt-3.5 pb-16 md:px-5">
      <div className="winter-banner rounded-[14px] px-3.5 py-3 text-white">
        <h1 className="text-lg font-extrabold">{winterPromo.title}</h1>
        <p className="mt-1 text-xs text-white/80">{winterPromo.subtitle} · עד יום שישי 27.11</p>
        <WinterCountdown compact />
      </div>
      <p className="mt-3 text-xs text-muted">
        מחיר החבילה הוא סכום מחירי הפריטים באתר, כולל מע״מ. לפני ההזמנה נאשר התאמה לפי מספר הרכב.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {bundles.map((b) => (
          <BundleCard key={b.id} bundle={b} bySku={bySku} />
        ))}
      </div>
    </div>
  );
}

function BundleCard({ bundle, bySku }: { bundle: WinterBundle; bySku: Map<string, Product> }) {
  const add = useCart((s) => s.add);
  const total = bundleTotal(bundle);
  const rows = bundle.items.map((i) => ({ ...i, product: bySku.get(i.sku) }));
  const missing = rows.some((r) => !r.product);
  const outOfStock = rows.some((r) => isOutOfStock(overlayStock(r.sku)));
  const disabled = missing || outOfStock || total == null;

  return (
    <article
      id={bundle.id}
      className="relative scroll-mt-20 rounded-2xl border border-line bg-card p-3.5 shadow-lift"
    >
      <span className="absolute top-3.5 left-3.5 rounded-full bg-[#1f2937] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
        טיפול חורף
      </span>
      <p className="text-[11px] font-bold text-accent">{bundle.label}</p>
      <h2 className="mt-0.5 text-lg leading-tight font-extrabold">{bundle.title}</h2>
      <p className="text-[15px] font-bold">{bundle.vehicle}</p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => {
          const img = r.product ? overlayImage(r.sku) || r.product.image : undefined;
          return (
            <li key={r.sku} className="flex items-center gap-3">
              <Link
                to="/product/$id"
                params={{ id: r.product?.id || r.sku }}
                className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white [&_[data-product-placeholder]]:p-1 [&_[data-product-placeholder]_span]:hidden"
              >
                <ProductImage
                  src={img}
                  alt={r.product?.name || r.sku}
                  className="h-full w-full object-contain p-1"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to="/product/$id"
                  params={{ id: r.product?.id || r.sku }}
                  className="line-clamp-2 text-[13px] leading-snug font-semibold hover:underline"
                >
                  {r.product?.name || r.sku}
                </Link>
                <p className="text-[11px] text-muted">
                  מק״ט {r.sku}
                  {r.qty > 1 ? ` · ${r.qty} יח׳` : ""}
                </p>
              </div>
              <bdi className="shrink-0 text-[13px] font-bold tabular-nums">
                {catalogPrice(r.sku) != null && r.qty > 1
                  ? formatCatalogPrice((catalogPrice(r.sku) as number) * r.qty)
                  : priceOrQuoteLabel(r.sku)}
              </bdi>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm font-bold">סה״כ לחבילה ({rows.length} פריטים)</span>
        <bdi className="text-[26px] font-extrabold text-accent tabular-nums">
          {total == null ? "—" : formatCatalogPrice(total)}
        </bdi>
      </div>
      <p className="text-[11px] text-muted">כולל מע״מ · המחיר זהה לקנייה של כל פריט בנפרד</p>
      <Button
        className="mt-3 h-12 w-full rounded-xl bg-accent text-[15px] font-extrabold text-on-accent hover:bg-accent-hot"
        disabled={disabled}
        onClick={() => {
          for (const line of bundleCartAdds(bundle)) {
            const p = bySku.get(line.sku);
            if (p) add(p.id, line.qty);
          }
          toast.success("החבילה נוספה לסל", { description: `${bundle.title} · ${bundle.vehicle}` });
        }}
      >
        {outOfStock ? "חלק מהפריטים אזלו מהמלאי" : "הוסף חבילה לסל"}
      </Button>
    </article>
  );
}
