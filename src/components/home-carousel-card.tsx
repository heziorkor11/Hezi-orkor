import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ProductImage } from "@/components/product-image";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog-types";
import { priceOrQuoteLabel } from "@/lib/prices";
import { useCatalogOverlayRev } from "@/components/catalog-overlay-sync";
import { ProductTagBadges } from "@/components/product-tag-badges";
import { getProductTags } from "@/lib/product-tags";

export function HomeCarouselCard({
  product,
  badge,
}: {
  product: Product;
  badge?: string;
}) {
  useCatalogOverlayRev();
  const add = useCart((s) => s.add);

  return (
    <article className="home-carousel-card sq-card flex h-full flex-col overflow-hidden border border-line bg-card">
      <Link to="/product/$id" params={{ id: product.id }} className="relative block">
        {getProductTags(product.sku).length ? (
          <ProductTagBadges sku={product.sku} />
        ) : badge ? (
          <span className="absolute top-2 right-2 z-[1] rounded-lg bg-accent px-2.5 py-0.5 text-[11px] font-extrabold text-on-accent">
            {badge}
          </span>
        ) : null}
        <div className="relative aspect-square w-full bg-white">
          <ProductImage
            src={product.image}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 min-h-10 text-[13px] leading-snug font-bold text-fg">
          <Link to="/product/$id" params={{ id: product.id }} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <p className="text-lg font-extrabold tabular-nums text-fg">{priceOrQuoteLabel(product.sku)}</p>
        <button
          type="button"
          className="sq-btn mt-auto inline-flex h-11 w-full items-center justify-center bg-accent text-sm font-extrabold text-on-accent hover:bg-accent-hot"
          onClick={() => {
            add(product.id, 1);
            toast.success("נוסף לרשימת ההצעה");
          }}
        >
          הוסף להצעה
        </button>
      </div>
    </article>
  );
}
