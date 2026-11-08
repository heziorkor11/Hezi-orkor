import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Pagination } from "./pagination";
import { BulkPackControls } from "./bulk-pack-controls";
import { DemoBanner } from "./demo-banner";
import { useAdminOverlay } from "@/lib/admin/use-overlay";
import {
  catalogPrice,
  formatCatalogPrice,
  catalogPromotion,
  regularCatalogPrice,
} from "@/lib/prices";
import { parsePackSize } from "@/lib/pack-price";
import { packUnitValue } from "@/lib/bulk-unit-value";
import { subcategories } from "@/lib/display-taxonomy";
import type { Product, ListingResult, ListingSearch } from "@/lib/catalog";
import "@/styles/bulk-packs.css";
function BulkPackCard({ product }: { product: Product }) {
  useAdminOverlay();
  const [broken, setBroken] = useState(false);
  const pack = parsePackSize(product.name),
    price = catalogPrice(product.sku),
    unit = packUnitValue(pack, price);
  const promotion = catalogPromotion(product.sku);
  const regular = regularCatalogPrice(product.sku);
  const size = pack
    ? pack.kind === "liter"
      ? `מיכל / חבית ${pack.qty} ליטר`
      : `מארז ${pack.qty} יחידות`
    : "מארז — יש לאשר תכולה";
  return (
    <article className="bulk-value-card" data-bulk-unit-value>
      <span className="bulk-pack-badge">{size}</span>
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="bulk-product-photo"
        aria-label={product.name}
      >
        {product.image && !broken ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="bulk-photo-placeholder">
            <span aria-hidden="true">▣</span>
            <small>תמונת מוצר תתווסף בהמשך</small>
          </div>
        )}
      </Link>
      <small className="bulk-sku" dir="ltr">
        {product.sku}
      </small>
      <h2>
        <Link to="/product/$id" params={{ id: product.id }}>
          {product.name}
        </Link>
      </h2>
      {product.inStock === false && <p className="bulk-small">אזל מהמלאי</p>}
      {promotion && regular != null && (
        <div className="bulk-existing-promo">
          <span className="bulk-pack-badge">{promotion.badge}</span>{" "}
          <del>{formatCatalogPrice(regular)}</del>
        </div>
      )}
      <div className="bulk-pack-price" data-bulk-pack-price>
        {price == null ? "מחיר בתיאום" : formatCatalogPrice(price)}
      </div>
      <small className="bulk-small">מחיר קטלוג למארז אחד · כולל מע״מ</small>
      {unit && (
        <div className="bulk-unit-metric" data-bulk-unit-price>
          <small>מחיר מחושב {unit.unit} בתוך המארז</small>
          <div>
            <strong>{formatCatalogPrice(unit.price)}</strong>
            <span>
              {pack?.kind === "unit"
                ? `${pack.qty} יחידות${pack.unitLiters ? ` × ${pack.unitLiters} ליטר` : ""}`
                : `${pack?.qty} ליטר`}
            </span>
          </div>
        </div>
      )}
      {unit && (
        <p className="bulk-small bulk-calculation">
          חישוב: {formatCatalogPrice(price!)} ÷ {pack!.qty}. זהו ערך מחושב בתוך המארז, לא מחיר קנייה
          בודדת.
        </p>
      )}
      <BulkPackControls product={product} unitValue />
    </article>
  );
}
export function BulkPacksPage({
  listing,
  state,
}: {
  listing: ListingResult;
  state: ListingSearch;
}) {
  const clean = {
    ...state,
    make: undefined,
    model: undefined,
    year: undefined,
    type: undefined,
    fluidKind: undefined,
    oilBrand: undefined,
    page: undefined,
  };
  return (
    <main className="bulk-unit-page" dir="rtl">
      <div className="bulk-page-shell">
        <DemoBanner />
        <header className="bulk-value-hero">
          <span className="bulk-eyebrow">מארזים וכמויות למוסכים</span>
          <h1>
            מארז אחד.
            <br />
            <em>המחיר ברור.</em>
          </h1>
          <p>
            לפני שממלאים את המדף במוסך,
            <br />
            יודעים בדיוק מה מקבלים בכל מארז.
          </p>
          <div className="bulk-hero-note">
            בוחרים מספר מארזים ורואים את הסכום.
            <br />
            הנחת כמות תופיע רק כשהוגדרה ונצברה זכאות.
          </div>
        </header>
        <nav className="bulk-subcategories" aria-label="סוגי מארזים">
          <Link
            to="/results"
            search={{ ...clean, sub: undefined }}
            aria-current={!state.sub ? "page" : undefined}
          >
            כל המארזים
          </Link>
          {(subcategories["workshop-packs"] || [])
            .filter((s) => s.count > 0)
            .map((s) => (
              <Link
                key={s.id}
                to="/results"
                search={{ ...clean, sub: s.id }}
                aria-current={state.sub === s.id ? "page" : undefined}
              >
                {s.name}
              </Link>
            ))}
        </nav>
        <form className="bulk-search" action="/results" method="get">
          <input type="hidden" name="category" value="workshop-packs" />
          {state.sub && <input type="hidden" name="sub" value={state.sub} />}
          <label htmlFor="bulk-search">חיפוש במארזים</label>
          <div>
            <input
              key={state.q}
              id="bulk-search"
              name="q"
              defaultValue={state.q || ""}
              placeholder="שם מוצר, מותג או מק״ט"
            />
            <button>חפש</button>
          </div>
        </form>
        <div className="bulk-results-meta">
          <span>
            {listing.total} {listing.total === 1 ? "מארז" : "מארזים"}
            {listing.pages > 1 ? ` · עמוד ${listing.page} מתוך ${listing.pages}` : ""}
          </span>
          <span>אין צורך לבחור רכב</span>
        </div>
        {state.q && (
          <p className="bulk-search-state">
            מסונן: {state.q} ·{" "}
            <Link to="/results" search={{ category: "workshop-packs", sub: state.sub }}>
              נקה
            </Link>
          </p>
        )}
        {listing.items.length ? (
          <div className="bulk-value-grid">
            {listing.items.map((p) => (
              <BulkPackCard key={p.sku} product={p} />
            ))}
          </div>
        ) : (
          <section className="bulk-empty">
            <h2>לא נמצאו מארזים בחיפוש הזה</h2>
            <Link to="/results" search={{ category: "workshop-packs" }}>
              הצג את כל המארזים
            </Link>
          </section>
        )}
        <Pagination page={listing.page} total={listing.total} search={clean} />
        <aside className="bulk-personal-quote">
          <span className="bulk-eyebrow">גם לכמות שלא מופיעה כאן</span>
          <h2>המוסך צריך יותר?</h2>
          <p>
            בכל מארז אפשר לבחור ״כמות אחרת / הצעת מחיר למוסך״ ולפתוח פנייה עם המוצר והכמות הרצויה
            ב־WhatsApp. הפנייה נשלחת רק באישור שלכם, ולא נשמרת באתר.
          </p>
        </aside>
      </div>
    </main>
  );
}
