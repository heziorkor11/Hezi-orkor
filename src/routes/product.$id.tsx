import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { JsonLd } from "@/components/json-ld";
import { PartIcon } from "@/components/part-icon";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { useCart } from "@/lib/cart";
import { categoryName, loadProduct, loadRelated, quoteMessage, waLink } from "@/lib/catalog";
import { breadcrumbJsonLd, pageDescription, pageTitle, productJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const product = await loadProduct(params.id);
    if (!product) throw notFound();
    const related = await loadRelated(product);
    return { product, related };
  },
  pendingComponent: () => (
    <div className="mx-auto max-w-[1180px] px-5 py-16 text-center text-muted">טוען מוצר…</div>
  ),
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    if (!product) return { meta: [{ title: pageTitle("מוצר לא נמצא") }] };
    return {
      meta: [
        { title: pageTitle(product.name) },
        { name: "description", content: pageDescription(product.description) },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const cat = categoryName(product.category) || "קטגוריה";

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
      <JsonLd data={productJsonLd(product)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "ראשי", path: "/" },
          { name: cat, path: `/results?category=${product.category}` },
          { name: product.name, path: `/product/${product.id}` },
        ])}
      />
      <DemoBanner />
      <nav className="mb-3 text-sm text-muted">
        <Link to="/" className="hover:text-fg">
          ראשי
        </Link>
        <span className="mx-1.5">/</span>
        <Link to="/results" search={{ category: product.category }} className="hover:text-fg">
          {cat}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-fg-soft">{product.sku}</span>
      </nav>
      <div className="grid grid-cols-1 gap-7 rounded-xl border border-line bg-card p-5 md:grid-cols-[1.1fr_0.9fr] md:p-6">
        <div className="grid min-h-80 place-items-center overflow-hidden rounded-lg border border-line bg-[radial-gradient(180px_120px_at_50%_50%,rgb(226_59_18_/_0.14),transparent),#100e0c]">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="h-full max-h-[420px] w-full object-contain p-4"
            />
          ) : (
            <div className="grid size-40 place-items-center rounded-3xl border border-line-strong bg-elevated">
              <PartIcon type={product.type} size={140} />
            </div>
          )}
        </div>
        <div>
          <span className="inline-block rounded-full bg-ok/12 px-2 py-0.5 text-[11px] font-bold text-ok">
            {product.condition}
          </span>
          <h1 className="mt-2 mb-2 text-[28px] leading-snug">{product.name}</h1>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-lg font-bold text-accent-warm">צור קשר להצעת מחיר</span>
          </div>
          <dl className="mb-4 grid grid-cols-[7.5rem_1fr] gap-x-2.5 gap-y-2 text-sm">
            <dt className="text-muted">מק״ט</dt>
            <dd className="font-semibold">{product.sku}</dd>
            {product.oe ? (
              <>
                <dt className="text-muted">OE</dt>
                <dd className="font-semibold">{product.oe}</dd>
              </>
            ) : null}
            {product.side ? (
              <>
                <dt className="text-muted">צד</dt>
                <dd className="font-semibold">{product.side}</dd>
              </>
            ) : null}
            {product.make ? (
              <>
                <dt className="text-muted">יצרן</dt>
                <dd className="font-semibold">{product.make}</dd>
              </>
            ) : null}
            {product.model ? (
              <>
                <dt className="text-muted">דגם</dt>
                <dd className="font-semibold">{product.model}</dd>
              </>
            ) : null}
            {product.yearFrom ? (
              <>
                <dt className="text-muted">שנים</dt>
                <dd className="font-semibold">
                  {product.yearFrom === product.yearTo ? product.yearFrom : `${product.yearFrom}–${product.yearTo}`}
                </dd>
              </>
            ) : product.vehicleFitment ? (
              <>
                <dt className="text-muted">התאמה לרכב</dt>
                <dd className="font-semibold">{product.vehicleFitment}</dd>
              </>
            ) : (
              <>
                <dt className="text-muted">רכב</dt>
                <dd className="font-semibold">יש לאשר לפי מספר רכב</dd>
              </>
            )}
          </dl>
          <p className="mb-4 leading-relaxed text-fg-soft">{product.description}</p>
          <p className="mb-4 rounded-md border border-line bg-elevated px-3 py-2.5 text-sm text-muted">
            לפני התקנה יש לאשר התאמה לפי מספר רכב או מק״ט OE. חלק חליפי אינו בהכרח מקורי.{" "}
            <Link to="/legal/$slug" params={{ slug: "shipping" }} className="text-accent-hot underline">
              אחריות והתאמה
            </Link>
          </p>
          <div className="mb-4.5 flex items-center gap-2">
            <button
              type="button"
              className="grid size-11 place-items-center rounded-md border border-line-strong bg-elevated"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="הפחת"
            >
              <Minus className="size-4" />
            </button>
            <strong className="min-w-6 text-center tabular-nums">{qty}</strong>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-md border border-line-strong bg-elevated"
              onClick={() => setQty((q) => q + 1)}
              aria-label="הוסף"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              onClick={() => {
                add(product.id, qty);
                toast.success("נוסף לסל", { description: product.name });
              }}
            >
              הוסף לסל
            </Button>
            <a
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-fg hover:bg-accent-hot"
              target="_blank"
              rel="noreferrer"
              href={waLink(quoteMessage(product))}
            >
              <WhatsAppIcon className="size-4" />
              לבירור מלאי
            </a>
          </div>
        </div>
      </div>

      {related.length ? (
        <>
          <div className="mt-7 mb-4">
            <h2 className="text-[26px] tracking-tight">עוד באותה קטגוריה</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
