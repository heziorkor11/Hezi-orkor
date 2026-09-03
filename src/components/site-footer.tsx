import { Link } from "@tanstack/react-router";
import { HoursWidget } from "@/components/hours-widget";
import { brand } from "@/lib/catalog";
import { legalNav } from "@/lib/legal";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink px-7 py-9 text-muted">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-2.5 flex items-center gap-3">
            <img src="/brand/logo.jpg" alt={`לוגו ${brand.nameHe}`} className="h-16 w-auto" />
            <strong className="text-fg">{brand.nameHe}</strong>
          </div>
          <p className="max-w-md leading-relaxed">
            חלקי חילוף ואביזרים לרכב בנהריה. מוצאים לפי תמונה, מק״ט ויצרן-דגם-שנה.
          </p>
          <p className="mt-2 text-fg-soft">{brand.address}</p>
          <p className="mt-1">
            {brand.taglineHe} · {brand.phone}
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
            <Link to="/results" search={{ category: "lights" }} className="hover:text-fg">
              פנס ראשי
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/results" search={{ category: "brakes" }} className="hover:text-fg">
              בלמים
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/cart" className="hover:text-fg">
              רשימת הצעה
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
          <strong className="text-fg">משפטי ונגישות</strong>
          {legalNav.map((item) => (
            <p key={item.slug} className="mt-1 first:mt-2">
              <Link to="/legal/$slug" params={{ slug: item.slug }} className="hover:text-fg">
                {item.title}
              </Link>
            </p>
          ))}
          <p className="mt-1">
            <Link to="/legal" className="hover:text-fg">
              כל המסמכים
            </Link>
          </p>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-[1180px] text-xs leading-relaxed">
        המחיר וההתאמה מאושרים לפני תשלום. אין סליקה באתר. הסל באתר הוא רשימת הצעת מחיר בלבד.
      </p>
    </footer>
  );
}
