import { createFileRoute, Link } from "@tanstack/react-router";
import { DemoBanner } from "@/components/demo-banner";
import { FaqList } from "@/components/faq-list";
import { Finder } from "@/components/finder";
import { HomeCategoryRail } from "@/components/home-category-rail";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import { HomeParallaxBand } from "@/components/home-parallax-band";
import { HomeBrandsRail } from "@/components/home-brands-rail";
import { HomeProductCarousel } from "@/components/home-product-carousel";
import { JsonLd } from "@/components/json-ld";
import { brand } from "@/lib/brand";
import { categoryName, faqs, loadProductsBySkus } from "@/lib/catalog";
import { currentHomeDealsSkus, homeRecommendedSkus } from "@/lib/home-deals";
import { localBusinessJsonLd, pageDescription, websiteJsonLd } from "@/lib/seo";
import { bootAdminOverlay } from "@/lib/admin/boot-overlay";

export const Route = createFileRoute("/")({
  loader: async () => {
    await bootAdminOverlay();
    const [deals, recommended] = await Promise.all([
      loadProductsBySkus(currentHomeDealsSkus()),
      loadProductsBySkus(homeRecommendedSkus),
    ]);
    return { deals, recommended };
  },
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
  const { deals, recommended } = Route.useLoaderData();

  return (
    <>
      <JsonLd data={localBusinessJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <HomeHeroSlider />

      <section className="px-3.5 pt-5 md:px-5">
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-1 text-[17px] font-extrabold md:text-2xl">לפי קטגוריה או רכב</h2>
          <p className="mb-3 text-xs text-muted md:text-sm">
            אפשר לחפש בלי רכב. להתאמה מדויקת: יצרן ← דגם ← שנה
          </p>
          <Finder compact />
        </div>
      </section>

      <HomeCategoryRail />

      <div className="mx-auto max-w-[1180px] px-3.5 md:px-5">
        <DemoBanner />
      </div>

      <HomeProductCarousel
        title="מבצעי החודש"
        subtitle="בחירה מתוך הקטלוג — מחיר מחירון, בלי מחיר ישן מדומה"
        moreLabel="לכל הקטלוג"
        moreSearch={{}}
        products={deals}
        badge="מבצע"
      />

      <HomeProductCarousel
        title="מוצרים מומלצים"
        subtitle="חלקים עם תמונה מהקטלוג שלנו"
        moreLabel="עוד מוצרים"
        moreSearch={{ category: "brakes" }}
        products={recommended}
      />

      <div className="mx-auto max-w-[1180px]">
        <HomeParallaxBand />
      </div>

      <HomeBrandsRail />

      <div className="mx-auto max-w-[1180px] px-3.5 pt-8 pb-8 md:px-5 md:pb-16">
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="rounded-[14px] border border-line bg-card p-2.5 text-xs font-bold md:p-3.5 md:text-sm">
            מחיר מחירון
            <span className="mt-1 block text-[10.5px] font-normal leading-snug text-muted md:text-xs">
              אישור התאמה לפני תשלום · כולל מע״מ
            </span>
          </div>
          <div className="rounded-[14px] border border-line bg-card p-2.5 text-xs font-bold md:p-3.5 md:text-sm">
            {brand.city}
            <span className="mt-1 block text-[10.5px] font-normal leading-snug text-muted md:text-xs">
              {brand.street}
            </span>
          </div>
        </div>

        <div className="mt-8 mb-4.5 rounded-2xl border border-line bg-card p-4 shadow-lift md:p-5">
          <h2 className="text-[17px] font-extrabold tracking-tight md:text-[22px]">ביקורות בגוגל</h2>
          <p className="mt-1.5 text-sm text-muted md:text-[15px]">
            קראו ביקורות אמיתיות של לקוחות על חזי אורקור בנהריה במפות Google.
          </p>
          <a
            href={brand.mapsUrl}
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
