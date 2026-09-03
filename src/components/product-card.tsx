import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { PartIcon } from "@/components/part-icon";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { fitmentLabel, quoteMessage, type Product, waLink } from "@/lib/catalog";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

function yearRange(product: Product) {
  if (!product.yearFrom) return null;
  return product.yearFrom === product.yearTo ? String(product.yearFrom) : `${product.yearFrom}–${product.yearTo}`;
}

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const car = [product.make, product.model].filter(Boolean).join(" ");
  const years = yearRange(product);
  const fit = fitmentLabel(product);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-card transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-ember motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link to="/product/$id" params={{ id: product.id }} className="block">
        <div className="relative grid h-52 place-items-center overflow-hidden bg-[radial-gradient(120px_80px_at_50%_60%,rgb(226_59_18_/_0.14),transparent),linear-gradient(180deg,#1a1410,#0e0c0b)]">
          <span className="absolute top-2.5 right-2.5 z-10 rounded-full border border-line-strong bg-chip px-2 py-0.5 text-[11px] font-bold text-accent-warm">
            מק״ט {product.sku}
          </span>
          {product.image ? (
            <img src={product.image} alt={product.name} className="h-full w-full object-contain p-3 pb-16" />
          ) : (
            <div className="mb-10 grid size-24 place-items-center rounded-3xl border border-line-strong bg-elevated">
              <PartIcon type={product.type} size={72} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-ink via-ink/80 to-transparent px-3 pt-10 pb-2.5">
            <p className="truncate text-sm font-bold text-fg">{car || product.vehicleFitment || "יש לאשר לפי מספר רכב"}</p>
            {years ? <p className="text-xs font-semibold text-accent-warm">{years}</p> : null}
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3 className="min-h-10 text-[15px] leading-snug font-semibold text-fg">
          <Link to="/product/$id" params={{ id: product.id }} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
          {product.make ? (
            <>
              <dt className="text-muted">יצרן</dt>
              <dd className="font-bold text-fg">{product.make}</dd>
            </>
          ) : null}
          {product.model ? (
            <>
              <dt className="text-muted">דגם</dt>
              <dd className="font-bold text-fg">{product.model}</dd>
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
        </dl>
        <p className="mt-auto text-sm font-bold text-accent-warm">צור קשר להצעת מחיר</p>
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
          <a
            href={waLink(quoteMessage(product))}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1 rounded-md border border-line-strong bg-elevated px-3 text-sm font-semibold text-fg-soft hover:border-accent hover:text-fg"
          >
            <WhatsAppIcon className="size-4" />
            לבירור מלאי
          </a>
        </div>
      </div>
    </article>
  );
}
