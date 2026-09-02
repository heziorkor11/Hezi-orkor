import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PartIcon } from "@/components/part-icon";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/catalog";
import { money } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-ember">
      <Link to="/product/$id" params={{ id: product.id }} className="block">
        <div className="relative grid h-44 place-items-center bg-[radial-gradient(120px_80px_at_50%_60%,rgb(226_59_18_/_0.14),transparent),linear-gradient(180deg,#1a1410,#0e0c0b)]">
          <span className="absolute top-2.5 right-2.5 z-10 rounded-full border border-line-strong bg-chip px-2 py-0.5 text-[11px] font-bold text-accent-warm">
            מק״ט {product.sku}
          </span>
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <div className="grid size-24 place-items-center rounded-3xl border border-line-strong bg-elevated">
              <PartIcon type={product.type} size={72} />
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="min-h-10 text-[15px] leading-snug font-semibold text-fg">
          <Link to="/product/$id" params={{ id: product.id }} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted">
          {product.side ? (
            <span>
              צד: <b className="text-fg-soft">{product.side}</b>
            </span>
          ) : null}
          {product.yearFrom ? (
            <span>
              שנים:{" "}
              <b className="text-fg-soft">
                {product.yearFrom}
                {product.yearTo !== product.yearFrom ? `–${product.yearTo}` : ""}
              </b>
            </span>
          ) : (
            <span className="rounded-full bg-ok/12 px-2 py-0.5 font-bold text-ok">אוניברסלי</span>
          )}
        </div>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-[22px] font-extrabold tabular-nums text-fg">{money(product.price)}</span>
          {product.originalPrice ? (
            <span className="text-[13px] text-subtle line-through tabular-nums">
              {money(product.originalPrice)}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              add(product.id, 1);
              toast.success("נוסף לסל", { description: product.name });
            }}
          >
            הוסף לסל
          </Button>
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong bg-elevated px-3 text-sm font-semibold text-fg-soft hover:border-accent hover:text-fg"
          >
            פרטים
          </Link>
        </div>
      </div>
    </article>
  );
}
