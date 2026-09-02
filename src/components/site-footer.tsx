import { Link } from "@tanstack/react-router";
import { HoursWidget } from "@/components/hours-widget";
import { brand } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink px-7 py-9 text-muted">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <img src="/brand/logo.jpg" alt="Hezi Orkor" className="h-16 w-auto" />
            <strong className="text-fg">{brand.nameHe}</strong>
          </div>
          <p className="max-w-md leading-relaxed">
            חלקי חילוף ואביזרים לרכב בנהריה. מוצאים לפי תמונה, מק״ט ויצרן-דגם-שנה.
          </p>
          <p className="mt-2 text-fg-soft">{brand.address}</p>
          <p className="mt-1">
            {brand.tagline} · {brand.phone}
          </p>
          <div className="mt-3">
            <HoursWidget compact />
          </div>
        </div>
        <div>
          <strong className="text-fg">חיפוש</strong>
          <p className="mt-2">
            <Link to="/" className="hover:text-fg">
              בורר רכב
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/results" search={{ category: "radiator" }} className="hover:text-fg">
              רדיאטורים
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/results" search={{ category: "shocks" }} className="hover:text-fg">
              בולמים
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/cart" className="hover:text-fg">
              סל קניות
            </Link>
          </p>
        </div>
        <div>
          <strong className="text-fg">העסק</strong>
          <p className="mt-2">
            <Link to="/about" className="hover:text-fg">
              אודות
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/contact" className="hover:text-fg">
              יצירת קשר
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/help" className="hover:text-fg">
              בקשת חלק
            </Link>
          </p>
        </div>
        <div>
          <strong className="text-fg">חשוב לדעת</strong>
          <p className="mt-2 leading-relaxed">
            גרסת הדגמה. המלאי האמיתי יחובר מהמאסטר-קטלוג אחרי אישור מחירים.
          </p>
        </div>
      </div>
    </footer>
  );
}
