import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import {
  displayVehicle,
  fitmentLabel,
  pickDisplayedFitment,
  quoteMessage,
  type Product,
  type ProductFilter,
  waLink,
} from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { hideVehicleFitmentForFluid } from "@/lib/fluid-classify";
import { priceOrQuoteLabel } from "@/lib/prices";
import { packUnitPriceLabel } from "@/lib/pack-price";
import { isWorkshopPackSku } from "@/lib/display-taxonomy";
import { ProductTagBadges } from "@/components/product-tag-badges";
import { useCatalogOverlayRev } from "@/components/catalog-overlay-sync";

function yearRange(from?: number, to?: number) {
  if (!from) return null;
  return from === to ? String(from) : `${from}–${to}`;
}

export function ProductCard({
  product,
  filter,
}: {
  product: Product;
  /** Active finder filters — when set, card shows the matching fitment. */
  filter?: ProductFilter;
}) {
  useCatalogOverlayRev();
  const add = useCart((s) => s.add);
  const shown = pickDisplayedFitment(product, filter);
  const car = displayVehicle(shown.make, shown.model);
  const years = yearRange(shown.yearFrom, shown.yearTo);
  const fit = fitmentLabel(product);
  const extraLabel = shown.extraCount > 0 ? `+${shown.extraCount} רכבים` : null;
  const hideFit = hideVehicleFitmentForFluid(product.category, product.name);

  return (
    <article className="sq-card group flex h-full flex-col overflow-hidden border border-line bg-card transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link to="/product/$id" params={{ id: product.id }} className="block">
        <div className="border-b border-line bg-card px-3 py-2">
          <span className="text-[11px] font-bold text-accent">מק״ט {product.sku}</span>
        </div>
        <div
          data-product-photo
          className="relative grid aspect-[4/5] max-h-[220px] w-full place-items-center bg-white md:max-h-[280px]"
        >
          <ProductTagBadges sku={product.sku} />
          <ProductImage
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
        </div>
        <div data-product-fitment className="border-t border-line bg-card px-3 py-2.5">
          {hideFit ? (
            <p className="truncate text-sm font-bold text-fg">שמן / נוזל · בלי התאמת רכב</p>
          ) : (
            <>
              <p className="truncate text-sm font-bold text-fg">
                {car || product.vehicleFitment || "יש לאשר לפי מספר רכב"}
                {extraLabel ? (
                  <span className="mr-1.5 text-[11px] font-bold text-accent-warm">
                    {" "}
                    {extraLabel}
                  </span>
                ) : null}
              </p>
              {years ? <p className="text-xs font-semibold text-accent-warm">{years}</p> : null}
            </>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="min-h-10 text-[15px] leading-snug font-semibold text-fg">
          <Link to="/product/$id" params={{ id: product.id }} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
          {hideFit ? (
            <>
              <dt className="text-muted">סוג</dt>
              <dd className="font-bold text-fg">סינון לפי מותג / מק״ט</dd>
            </>
          ) : (
            <>
              {shown.make ? (
                <>
                  <dt className="text-muted">יצרן</dt>
                  <dd className="font-bold text-fg">{shown.make}</dd>
                </>
              ) : null}
              {shown.model ? (
                <>
                  <dt className="text-muted">דגם</dt>
                  <dd className="font-bold text-fg">
                    {shown.model}
                    {extraLabel ? (
                      <span className="mr-1 text-accent-warm"> {extraLabel}</span>
                    ) : null}
                  </dd>
                </>
              ) : null}
              {years ? (
                <>
                  <dt className="text-muted">שנים</dt>
                  <dd className="font-bold text-fg">{years}</dd>
                </>
              ) : product.vehicleFitment ? (
                <>
                  <dt className="text-muted">התאמה</dt>
                  <dd className="line-clamp-2 font-bold text-fg">{product.vehicleFitment}</dd>
                </>
              ) : (
                <>
                  <dt className="text-muted">רכב</dt>
                  <dd className="font-bold text-ok">{fit}</dd>
                </>
              )}
              {product.side ? (
                <>
                  <dt className="text-muted">צד</dt>
                  <dd className="font-bold text-fg">{product.side}</dd>
                </>
              ) : null}
            </>
          )}
        </dl>
        <div className="mt-auto">
          <p className="text-sm font-bold text-accent tabular-nums">
            {priceOrQuoteLabel(product.sku)}
          </p>
          {packUnitPriceLabel(product.sku, product.name) ? (
            <p className="text-[11px] text-muted tabular-nums">
              {packUnitPriceLabel(product.sku, product.name)}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {isWorkshopPackSku(product.sku) ? null : (
            <Button
              className="flex-1"
              onClick={() => {
                add(product.id, 1);
                toast.success("נוסף לרשימת הצעת מחיר", { description: product.name });
              }}
            >
              הוסף להצעה
            </Button>
          )}
          <a
            href={waLink(quoteMessage(product))}
            target="_blank"
            rel="noreferrer"
            className={
              isWorkshopPackSku(product.sku)
                ? "sq-btn inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-md bg-accent px-3 text-sm font-semibold text-fg hover:bg-accent-hot"
                : "sq-btn inline-flex h-11 items-center justify-center gap-1 border border-line-strong bg-elevated px-3 text-sm font-semibold text-fg-soft hover:border-accent hover:text-fg"
            }
          >
            <WhatsAppIcon className="size-4" />
            {isWorkshopPackSku(product.sku) ? "בירור מחיר בוואטסאפ" : "לבירור מלאי"}
          </a>
        </div>
      </div>
    </article>
  );
}
