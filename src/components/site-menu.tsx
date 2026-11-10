import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, X } from "lucide-react";
import { CategoryImage } from "@/components/category-image";
import { subcategories } from "@/lib/display-taxonomy";
import { VISUAL_CATEGORIES } from "@/lib/visual-categories";
import { useSiteMenu } from "@/lib/menu-store";
import { brand } from "@/lib/brand";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

export function SiteMenu() {
  const open = useSiteMenu((s) => s.open);
  const setOpen = useSiteMenu((s) => s.setOpen);
  const [catId, setCatId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setCatId(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (catId) setCatId(null);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, catId, setOpen]);

  if (!open) return null;

  const current = VISUAL_CATEGORIES.find((c) => c.id === catId);
  const subs = catId ? (subcategories[catId] || []).filter((s) => s.count > 0) : [];

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-panel" role="dialog" aria-modal="true" aria-label="תפריט קטגוריות">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
        {current ? (
          <button
            type="button"
            onClick={() => setCatId(null)}
            className="sq-btn inline-flex items-center gap-1 px-2 py-2 text-sm font-bold"
          >
            <ChevronLeft className="size-4 rotate-180" aria-hidden />
            חזרה
          </button>
        ) : (
          <h2 className="text-lg font-extrabold">קטגוריות</h2>
        )}
        <button
          type="button"
          aria-label="סגירת התפריט"
          onClick={() => setOpen(false)}
          className="sq-btn grid size-10 place-items-center border border-line"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3">
        {current ? (
          <>
            <p className="mb-3 text-base font-extrabold">{current.name}</p>
            <Link
              to="/results"
              search={{ category: current.id }}
              onClick={() => setOpen(false)}
              className="mb-3 flex items-center justify-between rounded-[14px] border border-line bg-card px-3.5 py-3 text-sm font-bold"
            >
              כל המוצרים ב{current.name}
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            {subs.length ? (
              <ul className="space-y-1.5">
                {subs.map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/results"
                      search={{ category: current.id, sub: s.id }}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between rounded-[14px] px-3.5 py-3 text-sm font-semibold hover:bg-elevated"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-muted tabular-nums">{s.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">אין תתי־קטגוריות. בחרו בכל המוצרים למעלה.</p>
            )}
          </>
        ) : (
          <ul className="space-y-1">
            <li>
              <Link
                to="/"
                hash="deals"
                onClick={() => setOpen(false)}
                className="mb-2 flex items-center justify-center rounded-[14px] bg-accent px-3.5 py-3 text-sm font-extrabold text-on-accent"
              >
                מבצעי החודש
              </Link>
            </li>
            {VISUAL_CATEGORIES.map((c) => {
              const hasSubs = (subcategories[c.id] || []).some((s) => s.count > 0);
              return (
                <li key={c.id}>
                  {hasSubs ? (
                    <button
                      type="button"
                      onClick={() => setCatId(c.id)}
                      className="flex w-full items-center gap-3 rounded-[14px] px-1.5 py-2 text-start hover:bg-elevated"
                    >
                      <span className="home-cat-squircle size-11 min-h-11 min-w-11">
                        <CategoryImage src={c.image} alt="" className="h-full w-full object-contain p-1.5" />
                      </span>
                      <span className="flex-1 text-[15px] font-bold">{c.name}</span>
                      <ChevronLeft className="size-4 text-muted" aria-hidden />
                    </button>
                  ) : (
                    <Link
                      to="/results"
                      search={{ category: c.id }}
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-3 rounded-[14px] px-1.5 py-2 hover:bg-elevated"
                    >
                      <span className="home-cat-squircle size-11 min-h-11 min-w-11">
                        <CategoryImage src={c.image} alt="" className="h-full w-full object-contain p-1.5" />
                      </span>
                      <span className="flex-1 text-[15px] font-bold">{c.name}</span>
                      <ChevronLeft className="size-4 text-muted" aria-hidden />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-line p-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href={`https://wa.me/${brand.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="sq-btn flex w-full items-center justify-center gap-2 bg-fg py-3 text-sm font-extrabold text-on-accent"
        >
          <WhatsAppIcon className="size-4" aria-hidden />
          צור קשר
        </a>
      </div>
    </div>
  );
}
