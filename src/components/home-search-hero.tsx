import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { loadListing } from "@/lib/catalog";
import type { Product } from "@/lib/catalog-types";
import { PartIcon } from "@/components/part-icon";

/** Visual category chips — eye-first entry (Light Clean D). */
export const VISUAL_CATEGORIES: {
  id: string;
  name: string;
  sub: string;
  image?: string;
  type?: import("@/lib/catalog-types").PartTypeId;
}[] = [
  {
    id: "spark-plugs",
    name: "מצתים",
    sub: "NGK ועוד",
    image: "/catalog/images/A1338_HZ-PLUG-00001_SILZKR7E11.jpg",
  },
  {
    id: "fluids",
    name: "שמנים ונוזלים",
    sub: "מנוע · גיר",
    image: "/catalog/images/A0834_HZ-OIL-00001_102888.jpg",
  },
  {
    id: "cabin-filter",
    name: "פילטר מזגן",
    sub: "תא נוסעים",
    image: "/catalog/images/A0084_HZ-CAF-00001_97133WJS2E200.jpg",
  },
  {
    id: "oil-filter",
    name: "מסנן שמן",
    sub: "החלפת שמן",
    image: "/catalog/images/A1074_HZ-OILF-00002_OX1137D.jpg",
  },
  {
    id: "ignition-coils",
    name: "סליל הצתה",
    sub: "הצתה",
    image: "/catalog/images/A0249_HZ-COIL-00001_IC526.jpg",
  },
];

export function HomeSearchHero() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      setBusy(true);
      loadListing({ q: trimmed })
        .then((listing) => {
          if (!cancelled) setHits(listing.items.slice(0, 6));
        })
        .catch(() => {
          if (!cancelled) setHits([]);
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  const showLive = q.trim().length >= 2;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = q.trim();
    navigate({ to: "/results", search: next ? { q: next } : {} });
  }

  const suggestLabel = useMemo(
    () => (showLive ? (busy ? "מחפש…" : "הצעות מהקטלוג") : "בחרו לפי תמונה"),
    [showLive, busy],
  );

  return (
    <section id="search" className="scroll-mt-20 px-3.5 pt-3.5 md:px-5 md:pt-8">
      <div className="mx-auto max-w-[720px]">
        <h1 className="mb-1.5 text-2xl font-extrabold tracking-tight md:text-[40px] md:leading-tight">
          חפשו חלק
        </h1>
        <p className="mb-3.5 text-[13.5px] leading-relaxed text-muted md:text-base">
          מק״ט, OE או שם. או בחרו תמונה למטה.
        </p>

        <form
          onSubmit={onSubmit}
          role="search"
          className="flex items-center gap-1.5 rounded-2xl border border-line bg-card p-1 shadow-lift"
          aria-label="חיפוש מק״ט, OE או שם חלק"
        >
          <label htmlFor="home-sku-search" className="sr-only">
            חיפוש חלק
          </label>
          <input
            id="home-sku-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="לדוגמה HZ-PLUG-00001 או מצת NGK"
            autoComplete="off"
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-3.5 text-[15px] text-fg outline-none placeholder:text-subtle"
          />
          <button
            type="submit"
            className="m-1 shrink-0 rounded-xl bg-accent px-3.5 py-3 text-[13px] font-extrabold text-on-accent shadow-[0_8px_20px_rgb(226_59_18_/_0.28)]"
          >
            חפש
          </button>
        </form>

        <p className="mt-3 mb-1 text-xs font-semibold text-muted">{suggestLabel}</p>
        <div
          className="flex gap-2 overflow-x-auto pb-1 hezi-scroll"
          aria-label={showLive ? "הצעות חיפוש" : "הצעות ויזואליות"}
        >
          {showLive
            ? hits.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$id"
                  params={{ id: p.id }}
                  className="min-w-[110px] max-w-[110px] rounded-[14px] border border-line bg-card p-2 text-center"
                >
                  <div className="mb-1.5 grid h-14 place-items-center overflow-hidden rounded-lg bg-elevated">
                    {p.image ? (
                      <img src={p.image} alt="" className="max-h-14 object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[10px] text-muted">ללא תמונה</span>
                    )}
                  </div>
                  <b className="line-clamp-2 text-[11px] leading-snug font-bold">{p.name}</b>
                  <span className="mt-0.5 block truncate text-[10px] text-muted">{p.sku}</span>
                </Link>
              ))
            : VISUAL_CATEGORIES.map((c) => (
                <Link
                  key={c.id}
                  to="/results"
                  search={{ category: c.id }}
                  className="min-w-[110px] rounded-[14px] border border-line bg-card p-2 text-center"
                >
                  {c.image ? (
                    <img
                      src={c.image}
                      alt=""
                      className="mx-auto mb-1.5 h-14 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="mx-auto mb-1.5 flex h-14 w-14 items-center justify-center">
                      <PartIcon type={c.type ?? "general"} className="h-12 w-12" />
                    </div>
                  )}
                  <b className="block text-[11px] font-bold">{c.name}</b>
                </Link>
              ))}
          {showLive && !busy && hits.length === 0 ? (
            <p className="py-4 text-sm text-muted">לא נמצאו הצעות — נסו מק״ט מלא או חפשו.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
