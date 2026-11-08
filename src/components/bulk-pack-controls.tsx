import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useAdminOverlay } from "@/lib/admin/use-overlay";
import { bulkRuleFor } from "@/lib/bulk-tiers";
import { quantitySavings } from "@/lib/bulk-unit-value";
import { quantityPrice, formatCatalogPrice, catalogPrice } from "@/lib/prices";
import { parsePackSize } from "@/lib/pack-price";
import { waLink, type Product } from "@/lib/catalog";
import { toast } from "sonner";
export function BulkPackControls({
  product,
  unitValue = false,
}: {
  product: Product;
  unitValue?: boolean;
}) {
  const state = useAdminOverlay();
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const pack = parsePackSize(product.name);
  const lines = items.map((i) => ({ sku: i.id, qty: i.qty }));
  const prior = items.find((i) => i.id === product.id)?.qty || 0;
  const combined = [
    ...lines.filter((l) => l.sku !== product.sku),
    { sku: product.sku, qty: qty + prior },
  ];
  const result = quantityPrice(product.sku, qty + prior, combined);
  const savings = quantitySavings(catalogPrice(product.sku), result.price, qty, result.percent);
  const rule = bulkRuleFor(product.sku, product.category, state.bulkRules || []);
  const message = `בקשת הצעת מחיר למוסך (טרם נשלחה)\nשם: ${name}\nמוצר: ${product.name}\nמק״ט: ${product.sku}\nכמות מארזים / מיכלים: ${qty}\nהערה: ${note}`;
  return (
    <div
      className={
        unitValue ? "bulk-controls" : "space-y-3 rounded-lg border border-line bg-card p-3 text-sm"
      }
    >
      {!unitValue && (
        <p className="font-bold">
          יחידת המכירה:{" "}
          {pack
            ? pack.kind === "unit"
              ? `מארז של ${pack.qty} יחידות${pack.unitLiters ? ` × ${pack.unitLiters} ליטר` : ""}`
              : `מיכל / חבית ${pack.qty} ליטר`
            : "מארז — יש לאשר תכולה"}
        </p>
      )}
      <div className={unitValue ? "bulk-quantity-row" : "flex items-center gap-2"}>
        <label className="flex flex-1 items-center justify-between gap-2">
          כמות מארזים / מיכלים
          <input
            aria-label="כמות מארזים"
            className="w-24 rounded border p-2"
            type="number"
            min="1"
            max="100000"
            value={qty}
            onChange={(e) =>
              setQty(Math.max(1, Math.min(100000, Math.floor(Number(e.target.value) || 1))))
            }
          />
        </label>
        <div className="bulk-steppers flex gap-1 [&>button]:size-11 [&>button]:rounded-lg [&>button]:border">
          <button
            type="button"
            aria-label="הפחת מארז"
            disabled={qty <= 1}
            onClick={() => setQty((n) => Math.max(1, n - 1))}
          >
            −
          </button>
          <button
            type="button"
            aria-label="הוסף מארז"
            disabled={qty >= 100000}
            onClick={() => setQty((n) => Math.min(100000, n + 1))}
          >
            +
          </button>
        </div>
      </div>
      {prior > 0 && (
        <p className="bulk-small">כבר בסל: {prior} מארזים. החישוב כולל אותם לזכאות למדרגה.</p>
      )}
      {savings > 0 && (
        <div className="bulk-savings" data-bulk-savings role="status">
          <strong>הנחת כמות {result.percent}%</strong>
          <span>חסכתם {formatCatalogPrice(savings)} בכמות שנבחרה</span>
        </div>
      )}
      {rule?.public && (
        <ul className="bulk-tier-list" aria-label="מדרגות כמות מוגדרות">
          {rule.tiers.map((t) => (
            <li key={t.minPacks}>
              מ־{t.minPacks} מארזים: {t.percent}% הנחה
            </li>
          ))}
        </ul>
      )}
      {rule?.aggregate && <p>צבירה בין מוצרים זכאים בסל · מספר מארזים, לא יחידות פנימיות</p>}
      {result.quoteOnly ? (
        <p>מחיר כמות בתיאום — בקשו הצעת מחיר</p>
      ) : (
        <p className="bulk-total font-bold" aria-live="polite" aria-atomic="true">
          סה״כ לכמות שנבחרה:{" "}
          {result.price == null
            ? "הצעת מחיר"
            : formatCatalogPrice(Math.round(result.price * qty * 100) / 100)}{" "}
          כולל מע״מ {result.percent > 0 && `· הנחת כמות ${result.percent}%`}
        </p>
      )}
      <button
        disabled={product.inStock === false}
        className="bulk-add w-full rounded bg-accent p-3 font-bold text-white"
        onClick={() => {
          add(product.id, qty);
          toast.success("המארזים נוספו להצעה");
        }}
      >
        הוסף {qty} מארזים להצעה
      </button>
      <button
        className="bulk-quote w-full rounded border p-3 font-bold"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        כמות אחרת / הצעת מחיר למוסך
      </button>
      {open && (
        <div className="space-y-2">
          <label className="block">
            שם / מוסך
            <input
              className="w-full rounded border p-2"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block">
            הערה
            <textarea
              className="w-full rounded border p-2"
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <p>הפרטים אינם נשמרים באתר. הפנייה תישלח רק לאחר לחיצה על שליחה ב־WhatsApp.</p>
          <a
            className="block rounded border p-3 font-bold"
            href={waLink(message)}
            target="_blank"
            rel="noreferrer"
          >
            פתיחת WhatsApp עם פרטי הפנייה
          </a>
        </div>
      )}
    </div>
  );
}
