import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { useCart } from "@/lib/cart";
import { brand, getProduct, waLink } from "@/lib/catalog";
import { money } from "@/lib/utils";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "סל הקניות | חזי אורקור | נהריה" },
      { name: "description", content: "סל הקניות של חזי אורקור. הזמנה לאישור בוואטסאפ, בלי סליקה באתר." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);

  const rows = items
    .map((c) => ({ ...c, product: getProduct(c.id) }))
    .filter((x): x is typeof x & { product: NonNullable<typeof x.product> } => Boolean(x.product));
  const sum = rows.reduce((s, x) => s + x.product.price * x.qty, 0);
  const ship = sum >= brand.freeShipFrom || sum === 0 ? 0 : brand.shipping;

  const orderText =
    "הזמנה מהאתר:\n" +
    rows.map((x) => `${x.product.sku} × ${x.qty} — ${x.product.name}`).join("\n") +
    "\nסה״כ " +
    (sum + ship) +
    " ₪";

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
      <div className="mb-4.5">
        <h2 className="text-[26px] tracking-tight">סל הקניות</h2>
        <p className="text-muted">{rows.length} פריטים</p>
      </div>

      {rows.length ? (
        <>
          <div className="flex flex-col gap-3">
            {rows.map((x) => (
              <div
                key={x.id}
                className="grid grid-cols-1 items-center gap-3 rounded-xl border border-line bg-card p-3.5 sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <Link
                    to="/product/$id"
                    params={{ id: x.product.id }}
                    className="font-semibold hover:underline"
                  >
                    {x.product.name}
                  </Link>
                  <div className="mt-1 text-xs text-muted">מק״ט {x.product.sku}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="grid size-11 place-items-center rounded-md border border-line-strong"
                      onClick={() => setQty(x.id, x.qty - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center tabular-nums">{x.qty}</span>
                    <button
                      type="button"
                      className="grid size-11 place-items-center rounded-md border border-line-strong"
                      onClick={() => setQty(x.id, x.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-lg font-extrabold tabular-nums">{money(x.product.price * x.qty)}</div>
                <Button variant="ghost" size="sm" onClick={() => remove(x.id)}>
                  <Trash2 className="size-4" />
                  הסר
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-line bg-card p-4">
            <p className="mb-2">
              משלוח: <b>{ship ? money(ship) : "חינם"}</b>{" "}
              {sum < brand.freeShipFrom && sum ? `(חינם מ־${money(brand.freeShipFrom)})` : ""}
            </p>
            <p className="mb-3">
              לתשלום: <span className="text-[22px] font-extrabold tabular-nums">{money(sum + ship)}</span>
            </p>
            <p className="mb-4 text-sm text-muted">
              התשלום בגרסת הדמו לא מחובר לסליקה. ההזמנה נשלחת אלינו בוואטסאפ לאישור.
            </p>
            <a
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-fg hover:bg-accent-hot"
              target="_blank"
              rel="noreferrer"
              href={waLink(orderText)}
            >
              <WhatsAppIcon className="size-4" />
              שליחה לאישור בוואטסאפ
            </a>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-line bg-card p-7 text-center">
          הסל ריק.{" "}
          <Link to="/" className="text-accent-hot underline">
            בחזרה לקטלוג
          </Link>
        </div>
      )}
    </div>
  );
}
