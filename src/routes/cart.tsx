import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { useCart } from "@/lib/cart";
import { loadProduct, quoteMessage, waLink, type Product } from "@/lib/catalog";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "סל הקניות | חזי אורקור | נהריה" },
      { name: "description", content: "סל הקניות של חזי אורקור. בקשת הצעת מחיר בוואטסאפ, בלי סליקה באתר." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);
  const [products, setProducts] = useState<Record<string, Product>>({});

  useEffect(() => {
    let cancelled = false;
    const ids = items.map((c) => c.id);
    Promise.all(ids.map((id) => loadProduct(id))).then((rows) => {
      if (cancelled) return;
      const next: Record<string, Product> = {};
      rows.forEach((p) => {
        if (p) next[p.id] = p;
      });
      setProducts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const rows = items
    .map((c) => ({ ...c, product: products[c.id] }))
    .filter((x): x is typeof x & { product: Product } => Boolean(x.product));

  const orderText =
    "שלום, אשמח להצעת מחיר ולבירור מלאי לפריטים מהאתר:\n" +
    rows.map((x) => `${x.product.sku} × ${x.qty} — ${x.product.name}`).join("\n");

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
      <div className="mb-4.5">
        <h1 className="text-[26px] tracking-tight">סל הקניות</h1>
        <p className="text-muted">{rows.length} פריטים</p>
      </div>

      {items.length && !rows.length ? (
        <p className="text-muted">טוען פריטים מהקטלוג…</p>
      ) : null}

      {rows.length ? (
        <>
          <div className="flex flex-col gap-3">
            {rows.map((x) => (
              <div
                key={x.id}
                className="grid grid-cols-1 items-center gap-3 rounded-xl border border-line bg-card p-3.5 sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <Link to="/product/$id" params={{ id: x.product.id }} className="font-semibold hover:underline">
                    {x.product.name}
                  </Link>
                  <div className="mt-1 text-xs text-muted">מק״ט {x.product.sku}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button type="button" className="grid size-11 place-items-center rounded-md border border-line-strong" onClick={() => setQty(x.id, x.qty - 1)} aria-label="הפחת כמות">−</button>
                    <span className="min-w-6 text-center tabular-nums" aria-live="polite">{x.qty}</span>
                    <button type="button" className="grid size-11 place-items-center rounded-md border border-line-strong" onClick={() => setQty(x.id, x.qty + 1)} aria-label="הוסף כמות">+</button>
                  </div>
                </div>
                <div className="text-sm font-bold text-accent-warm">צור קשר להצעת מחיר</div>
                <Button variant="ghost" size="sm" onClick={() => remove(x.id)}>
                  <Trash2 className="size-4" />
                  הסר
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-card p-4">
            <p className="mb-3 text-sm text-muted">
              אין מחירים באתר. נשלח הצעת מחיר ונברר מלאי בוואטסאפ לפני הזמנה. העסקה נכרתת רק אחרי אישור התאמה.
            </p>
            <p className="mb-4 text-sm text-muted">
              <Link to="/legal/$slug" params={{ slug: "cancellation" }} className="underline hover:text-fg">
                ביטול עסקה
              </Link>
              {" · "}
              <Link to="/legal/$slug" params={{ slug: "terms" }} className="underline hover:text-fg">
                תנאי שימוש
              </Link>
            </p>
            <a className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-fg hover:bg-accent-hot" target="_blank" rel="noreferrer" href={waLink(orderText || quoteMessage({ sku: "", name: "סל ריק" }))}>
              <WhatsAppIcon className="size-4" />
              שליחה להצעת מחיר בוואטסאפ
            </a>
          </div>
        </>
      ) : items.length ? null : (
        <div className="rounded-xl border border-line bg-card p-7 text-center">
          הסל ריק.{" "}
          <Link to="/" className="text-accent-hot underline">בחזרה לקטלוג</Link>
        </div>
      )}
    </div>
  );
}
