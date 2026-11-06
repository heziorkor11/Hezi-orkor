import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { FormField } from "@/components/form-field";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { loadProduct, type Product } from "@/lib/catalog";
import { useOrderForm } from "@/lib/order-form";
import {
  canSharePdfFile,
  downloadBlob,
  buildOrderPdfBlob,
  buildOrderShareText,
  ORDER_SHARE_HINT,
  preloadOrderPdf,
  waMeUrlForShareText,
} from "@/lib/order-pdf";
import {
  isValidIlPhone,
  isValidIlPlate,
  type OrderCustomer,
} from "@/lib/order-quote";
import { priceOrQuoteLabel } from "@/lib/prices";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "סל הקניות | חזי אורקור | נהריה" },
      {
        name: "description",
        content: "סל הקניות של חזי אורקור. שליחת הזמנה כ־PDF בוואטסאפ, בלי סליקה באתר.",
      },
    ],
  }),
  component: CartPage,
});

type PdfCache = {
  key: string;
  blob: Blob;
  orderRef: string;
  subtotal: number;
  quoteCount: number;
};

function CartPage() {
  const items = useCart((s) => s.items);
  const remove = useCart((s) => s.remove);
  const setQty = useCart((s) => s.setQty);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const pdfCacheRef = useRef<PdfCache | null>(null);
  const genSeq = useRef(0);

  const form = useOrderForm();
  const setField = useOrderForm((s) => s.setField);
  const prefillVehicleFromSaved = useOrderForm((s) => s.prefillVehicleFromSaved);

  useEffect(() => {
    prefillVehicleFromSaved();
  }, [prefillVehicleFromSaved]);

  // Preload PDF lib + Hebrew fonts as soon as cart opens
  useEffect(() => {
    void preloadOrderPdf().catch(() => {
      /* will retry on send */
    });
  }, []);

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

  const customer: OrderCustomer = useMemo(
    () => ({
      name: form.name,
      phone: form.phone,
      city: form.city,
      delivery: form.delivery,
      plate: form.plate,
      make: form.make,
      model: form.model,
      year: form.year,
      engine: form.engine,
      notes: form.notes,
    }),
    [
      form.name,
      form.phone,
      form.city,
      form.delivery,
      form.plate,
      form.make,
      form.model,
      form.year,
      form.engine,
      form.notes,
    ],
  );

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!customer.name.trim()) e.name = "נא למלא שם";
    if (!isValidIlPhone(customer.phone)) e.phone = "טלפון ישראלי לא תקין";
    if (!isValidIlPlate(customer.plate)) e.plate = "מספר רכב: 7 או 8 ספרות";
    return e;
  }, [customer.name, customer.phone, customer.plate]);

  const valid = Object.keys(errors).length === 0;

  const orderLines = useMemo(
    () =>
      rows.map((x) => ({
        sku: x.product.sku,
        name: x.product.name,
        qty: x.qty,
        oe: x.product.oe,
      })),
    [rows],
  );

  const cacheKey = useMemo(() => {
    if (!valid || !orderLines.length) return "";
    return JSON.stringify({ customer, lines: orderLines });
  }, [customer, orderLines, valid]);

  // Pre-generate + cache PDF Blob whenever the form is valid
  useEffect(() => {
    if (!cacheKey) {
      pdfCacheRef.current = null;
      setPdfReady(false);
      return;
    }
    if (pdfCacheRef.current?.key === cacheKey) {
      setPdfReady(true);
      return;
    }
    const seq = ++genSeq.current;
    setPdfReady(false);
    void (async () => {
      try {
        const result = await buildOrderPdfBlob({ customer, lines: orderLines });
        if (seq !== genSeq.current) return;
        pdfCacheRef.current = {
          key: cacheKey,
          blob: result.blob,
          orderRef: result.orderRef,
          subtotal: result.subtotal,
          quoteCount: result.quoteCount,
        };
        setPdfReady(true);
      } catch {
        if (seq !== genSeq.current) return;
        pdfCacheRef.current = null;
        setPdfReady(false);
      }
    })();
  }, [cacheKey, customer, orderLines]);

  const fallbackSend = useCallback((blob: Blob, orderRef: string, subtotal: number) => {
    downloadBlob(blob, `${orderRef}.pdf`);
    const text = buildOrderShareText({
      orderRef,
      customer,
      itemCount: orderLines.length,
      subtotal,
    });
    window.open(waMeUrlForShareText(text), "_blank", "noopener,noreferrer");
  }, [customer, orderLines.length]);

  const onSendOrder = useCallback(async () => {
    setShareError(null);
    if (!valid) {
      setTouched(true);
      return;
    }
    if (!orderLines.length) return;

    setSending(true);
    try {
      let cache = pdfCacheRef.current;
      if (!cache || cache.key !== cacheKey) {
        const result = await buildOrderPdfBlob({ customer, lines: orderLines });
        cache = {
          key: cacheKey,
          blob: result.blob,
          orderRef: result.orderRef,
          subtotal: result.subtotal,
          quoteCount: result.quoteCount,
        };
        pdfCacheRef.current = cache;
        setPdfReady(true);
      }

      const file = new File([cache.blob], `${cache.orderRef}.pdf`, {
        type: "application/pdf",
      });
      const text = buildOrderShareText({
        orderRef: cache.orderRef,
        customer,
        itemCount: orderLines.length,
        subtotal: cache.subtotal,
      });

      if (canSharePdfFile(file)) {
        try {
          await navigator.share({
            files: [file],
            text,
            title: `הזמנה ${cache.orderRef}`,
          });
          return;
        } catch (err) {
          // Cancel or share failure → fallback
          const name = err instanceof Error ? err.name : "";
          if (name !== "AbortError") {
            setShareError("השיתוף לא הושלם — מורידים PDF ופותחים וואטסאפ.");
          }
        }
      }

      fallbackSend(cache.blob, cache.orderRef, cache.subtotal);
    } catch {
      setShareError("לא הצלחנו ליצור את ה־PDF. נסו שוב.");
    } finally {
      setSending(false);
    }
  }, [valid, orderLines, cacheKey, customer, fallbackSend]);

  return (
    <div className="mx-auto max-w-[1180px] px-3.5 pt-7 pb-16 md:px-5">
      <div className="mb-4.5">
        <h1 className="text-[26px] tracking-tight">סל הקניות</h1>
        <p className="text-muted">{rows.length} פריטים · שליחת הזמנה כ־PDF בוואטסאפ</p>
      </div>

      {items.length && !rows.length ? <p className="text-muted">טוען פריטים מהקטלוג…</p> : null}

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
                      aria-label="הפחת כמות"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center tabular-nums" aria-live="polite">
                      {x.qty}
                    </span>
                    <button
                      type="button"
                      className="grid size-11 place-items-center rounded-md border border-line-strong"
                      onClick={() => setQty(x.id, x.qty + 1)}
                      aria-label="הוסף כמות"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-sm font-bold text-accent-warm tabular-nums">
                  {priceOrQuoteLabel(x.product.sku)}
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(x.id)}>
                  <Trash2 className="size-4" />
                  הסר
                </Button>
              </div>
            ))}
          </div>

          <section className="mt-5 rounded-2xl border border-line bg-card p-3.5 shadow-lift md:p-5">
            <h2 className="mb-1 text-[17px] font-extrabold tracking-tight">פרטי הזמנה</h2>
            <p className="mb-3.5 text-xs text-muted md:text-sm">
              השדות עם * חובה. בלחיצה נוצר PDF ונפתח שיתוף לוואטסאפ.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="שם מלא *">
                <Input
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="ישראל כהן"
                />
                {touched && errors.name ? (
                  <span className="text-xs text-accent-hot">{errors.name}</span>
                ) : null}
              </FormField>
              <FormField label="טלפון *" hint="נייד או קווי בישראל">
                <Input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="052-1234567"
                />
                {touched && errors.phone ? (
                  <span className="text-xs text-accent-hot">{errors.phone}</span>
                ) : null}
              </FormField>
              <FormField label="עיר">
                <Input
                  name="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="נהריה"
                />
              </FormField>
              <FormField label="משלוח / איסוף">
                <select
                  className="h-11 w-full rounded-md border border-line-strong bg-paper px-3 text-sm text-fg outline-none focus:border-accent-hot focus:ring-2 focus:ring-accent/30"
                  value={form.delivery}
                  onChange={(e) =>
                    setField("delivery", e.target.value as OrderCustomer["delivery"])
                  }
                >
                  <option value="">בחרו…</option>
                  <option value="pickup">איסוף עצמי מנהריה</option>
                  <option value="delivery">משלוח</option>
                </select>
              </FormField>
              <FormField label="מספר רישוי *" hint="7 או 8 ספרות">
                <Input
                  name="plate"
                  inputMode="numeric"
                  value={form.plate}
                  onChange={(e) => setField("plate", e.target.value)}
                  placeholder="12-345-67"
                />
                {touched && errors.plate ? (
                  <span className="text-xs text-accent-hot">{errors.plate}</span>
                ) : null}
              </FormField>
              <FormField label="יצרן">
                <Input
                  name="make"
                  value={form.make}
                  onChange={(e) => setField("make", e.target.value)}
                  placeholder="טויוטה"
                />
              </FormField>
              <FormField label="דגם">
                <Input
                  name="model"
                  value={form.model}
                  onChange={(e) => setField("model", e.target.value)}
                  placeholder="קורולה"
                />
              </FormField>
              <FormField label="שנה">
                <Input
                  name="year"
                  inputMode="numeric"
                  value={form.year}
                  onChange={(e) => setField("year", e.target.value)}
                  placeholder="2015"
                />
              </FormField>
              <FormField label="מנוע (אופציונלי)">
                <Input
                  name="engine"
                  value={form.engine}
                  onChange={(e) => setField("engine", e.target.value)}
                  placeholder="1.6"
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="הערות">
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent-hot focus:ring-2 focus:ring-accent/30"
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="שעות מועדפות לאיסוף, הערות התאמה…"
                  />
                </FormField>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-elevated/60 p-3.5">
              <p className="mb-3 text-sm text-muted">
                המחירים באתר הם מחירון. נאשר התאמה ומחיר סופי בוואטסאפ לפני הזמנה. אין סליקה באתר.
              </p>
              <p className="mb-4 text-sm text-muted">
                <Link
                  to="/legal/$slug"
                  params={{ slug: "cancellation" }}
                  className="underline hover:text-fg"
                >
                  ביטול עסקה
                </Link>
                {" · "}
                <Link to="/legal/$slug" params={{ slug: "terms" }} className="underline hover:text-fg">
                  תנאי שימוש
                </Link>
              </p>
              <Button
                type="button"
                className="h-12 w-full rounded-xl text-sm font-extrabold sm:w-auto"
                disabled={sending}
                onClick={() => void onSendOrder()}
              >
                <WhatsAppIcon className="size-4" />
                {sending ? "יוצר PDF…" : "שלח הזמנה"}
              </Button>
              <p className="mt-2 text-xs text-muted">{ORDER_SHARE_HINT}</p>
              {valid && !pdfReady ? (
                <p className="mt-1 text-xs text-muted">מכין את קובץ ההזמנה ברקע…</p>
              ) : null}
              {touched && !valid ? (
                <p className="mt-2 text-xs text-accent-hot">נא להשלים את שדות החובה לפני השליחה.</p>
              ) : null}
              {shareError ? <p className="mt-2 text-xs text-accent-hot">{shareError}</p> : null}
            </div>
          </section>
        </>
      ) : items.length ? null : (
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
