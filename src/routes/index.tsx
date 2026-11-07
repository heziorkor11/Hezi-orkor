import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoBanner } from "@/components/demo-banner";
import { FaqList } from "@/components/faq-list";
import { Finder } from "@/components/finder";
import { HomeSearchHero, VISUAL_CATEGORIES } from "@/components/home-search-hero";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { brand } from "@/lib/brand";
import { categoryName, faqs, loadFeatured } from "@/lib/catalog";
import { localBusinessJsonLd, pageDescription, websiteJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/")({
  loader: () => loadFeatured(),
  pendingComponent: () => (
    <div className="mx-auto max-w-[1180px] px-5 py-16 text-center text-muted">טוען…</div>
  ),
  head: () => ({
    meta: [
      { title: `חלקי חילוף לרכב בנהריה | ${brand.nameHe}` },
      {
        name: "description",
        content: pageDescription(
          "חזי אורקור בנהריה — חלקי חילוף ואביזרים לרכב. חיפוש לפי סוג חלק, יצרן, דגם ושנה או לפי מק״ט. איסוף או משלוח.",
        ),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = Route.useLoaderData();

  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <HomeSearchHero />

      <section className="px-3.5 pt-[18px] md:px-5">
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-1 text-[17px] font-extrabold md:text-2xl">לפי הרכב</h2>
          <p className="mb-3 text-xs text-muted md:text-sm">כשאין מק״ט — יצרן ← דגם ← שנה</p>
          <Finder compact />
        </div>
      </section>

      <section id="categories" className="scroll-mt-20 px-3.5 pt-[18px] md:px-5">
        <div className="mx-auto max-w-[720px] md:max-w-[1180px]">
          <h2 className="mb-1 text-[17px] font-extrabold md:text-2xl">קטגוריות בתמונה</h2>
          <p className="mb-3 text-xs text-muted md:text-sm">זיהוי מהיר בעין</p>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
            {VISUAL_CATEGORIES.map((c) => (
              <Link
                key={c.id}
                to="/results"
                search={{ category: c.id }}
                className="overflow-hidden rounded-2xl border border-line bg-card"
              >
                <div className="grid h-[88px] place-items-center bg-white p-2">
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="max-h-[72px] object-contain" loading="lazy" />
                  ) : (
                    <div className="flex h-[72px] w-full items-center justify-center">
                      <span className="text-xs text-muted">תמונה חסרה</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-line px-2.5 py-2.5">
                  <b className="block text-[13px] font-bold">{c.name}</b>
                  <span className="text-[11px] text-muted">{c.sub}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-3.5 pt-7 pb-8 md:px-5 md:pb-16">
        <DemoBanner />
        <div className="mb-3">
          <h2 className="text-[17px] font-extrabold tracking-tight md:text-[26px]">מהקטלוג</h2>
          <p className="text-xs text-muted md:text-sm">תמונה · מק״ט · מחיר מחירון</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 md:mt-8 md:gap-3">
          <div className="rounded-[14px] border border-line bg-card p-2.5 text-xs font-bold md:p-3.5 md:text-sm">
            מחיר מחירון
            <span className="mt-1 block text-[10.5px] font-normal leading-snug text-muted md:text-xs">
              אישור התאמה לפני תשלום
            </span>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-2.5 text-xs font-bold md:p-3.5 md:text-sm">
            {brand.city}
            <span className="mt-1 block text-[10.5px] font-normal leading-snug text-muted md:text-xs">
              {brand.street}
            </span>
          </div>
        </div>

        <div className="mt-9 mb-4.5 rounded-2xl border border-line bg-card p-4 shadow-lift md:p-5">
          <h2 className="text-[17px] font-extrabold tracking-tight md:text-[22px]">ביקורות בגוגל</h2>
          <p className="mt-1.5 text-sm text-muted md:text-[15px]">
            קראו ביקורות אמיתיות של לקוחות על חזי אורקור בנהריה במפות Google.
          </p>
          <a
            href="https://www.google.com/maps/place/%D7%97%D7%96%D7%99+%D7%90%D7%95%D7%A8%D7%A7%D7%95%D7%A8/@33.002921,35.097601,17z"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-on-accent"
          >
            לצפייה בביקורות בגוגל
          </a>
        </div>

        <FaqList items={[...faqs]} />

        <p className="mt-6 text-center text-[11px] text-muted md:hidden">
          קטגוריות נוספות:{" "}
          {["radiator", "brakes", "filters"].map((id, i) => (
            <span key={id}>
              {i ? " · " : null}
              <Link to="/results" search={{ category: id }} className="underline">
                {categoryName(id) || id}
              </Link>
            </span>
          ))}
        </p>
      </div>
    </>
  );
}
