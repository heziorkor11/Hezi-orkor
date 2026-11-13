import { Link } from "@tanstack/react-router";
import { HoursWidget } from "@/components/hours-widget";
import { brand } from "@/lib/brand";
import { legalNav } from "@/lib/legal";
import { isHiddenCategory } from "@/lib/display-taxonomy";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-white/10 bg-[#121212] px-7 py-10 text-white/70">
      <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <img
              src="/brand/logo.jpg"
              alt={`לוגו ${brand.nameHe}`}
              className="h-14 w-auto rounded-md"
              loading="lazy"
            />
            <strong className="text-white">{brand.nameHe}</strong>
          </div>
          <p className="max-w-md leading-relaxed">
            חלקי חילוף ואביזרים לרכב בנהריה. מוצאים לפי תמונה, מק״ט ויצרן-דגם-שנה.
          </p>
          <p className="mt-2 text-white/85">{brand.address}</p>
          <p className="mt-1">
            {brand.taglineHe} · {brand.phone}
          </p>
          <p className="mt-2">{brand.pickupLeadTime}</p>
          <p className="mt-1">{brand.shippingLeadTime}</p>
          <div className="mt-3 text-white/80 [&_.text-fg]:!text-white [&_.text-muted]:!text-white/55">
            <HoursWidget compact />
          </div>
        </div>
        <div>
          <strong className="text-white">חיפוש</strong>
          <p className="mt-2">
            <Link to="/" className="hover:text-white">
              בורר רכב
            </Link>
          </p>
          {!isHiddenCategory("lights") ? (
            <p className="mt-1">
              <Link to="/results" search={{ category: "lights" }} className="hover:text-white">
                פנס ראשי
              </Link>
            </p>
          ) : null}
          <p className="mt-1">
            <Link to="/results" search={{ category: "brakes" }} className="hover:text-white">
              בלמים
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/cart" className="hover:text-white">
              רשימת הצעה
            </Link>
          </p>
        </div>
        <div>
          <strong className="text-white">העסק</strong>
          <p className="mt-2">
            <Link to="/about" className="hover:text-white">
              אודות
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/contact" className="hover:text-white">
              יצירת קשר
            </Link>
          </p>
          <p className="mt-1">
            <Link to="/help" className="hover:text-white">
              בקשת חלק
            </Link>
          </p>
        </div>
        <div>
          <strong className="text-white">משפטי ונגישות</strong>
          {legalNav.map((item) => (
            <p key={item.slug} className="mt-1 first:mt-2">
              <Link to="/legal/$slug" params={{ slug: item.slug }} className="hover:text-white">
                {item.title}
              </Link>
            </p>
          ))}
          <p className="mt-1">
            <Link to="/legal" className="hover:text-white">
              כל המסמכים
            </Link>
          </p>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-[1180px] border-t border-white/10 pt-5 text-xs leading-relaxed text-white/55">
        המחיר וההתאמה מאושרים לפני תשלום. אין סליקה באתר. הסל באתר הוא רשימת הצעת מחיר בלבד. המחירים
        כוללים מע״מ אלא אם צוין אחרת.
      </p>
    </footer>
  );
}
