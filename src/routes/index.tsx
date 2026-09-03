import { createFileRoute } from "@tanstack/react-router";
import { DemoBanner } from "@/components/demo-banner";
import { FaqList } from "@/components/faq-list";
import { Finder } from "@/components/finder";
import { JsonLd } from "@/components/json-ld";
import { ProductCard } from "@/components/product-card";
import { brand, faqs, loadFeatured, reviews } from "@/lib/catalog";
import { localBusinessJsonLd, pageDescription, websiteJsonLd } from "@/lib/seo";
import { money } from "@/lib/utils";
import { Star } from "lucide-react";

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
      <section className="relative isolate flex flex-col items-center justify-end overflow-hidden px-5 pt-8 pb-6 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="/brand/logo.jpg"
            className="h-full w-full object-cover object-[center_35%] motion-reduce:hidden"
          >
            <source src="/brand/logo-loop.mp4" type="video/mp4" />
          </video>
          <img
            src="/brand/logo.jpg"
            alt=""
            className="hidden h-full w-full object-cover object-[center_35%] motion-reduce:block"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_5_6_/_0.15)_0%,rgb(5_5_6_/_0.45)_52%,rgb(5_5_6_/_0.94)_100%),radial-gradient(700px_260px_at_50%_28%,rgb(226_59_18_/_0.16),transparent)]" />
        </div>
        <h1 className="sr-only">חזי אורקור — חלקי חילוף לרכב בנהריה</h1>
        <p className="mb-2 text-lg font-bold text-fg">חלקי חילוף לרכב בנהריה</p>
        <p className="mb-4 text-base text-fg-soft">
          מוצאים לפי מק״ט, OE או לפי יצרן־דגם־שנה. בלי מחיר באתר — שולחים הצעת מחיר אחרי אישור התאמה.
        </p>
        <Finder />
      </section>

      <div className="grid grid-cols-2 border-y border-line bg-panel lg:grid-cols-4">
        <Trust k="משלוח נוח" v={`₪${brand.shipping} · חינם מ־${money(brand.freeShipFrom)}`} />
        <Trust k="אספקה מהירה" v="איסוף מנהריה או שליח" />
        <Trust k="התאמה לפי רכב" v="קטגוריה ← יצרן ← דגם ← שנה" />
        <Trust k="אדם בצד השני" v={`וואטסאפ ${brand.phone}`} />
      </div>

      <div className="mx-auto max-w-[1180px] px-5 pt-7 pb-16">
        <DemoBanner />
        <div className="mb-4.5">
          <h2 className="text-[26px] tracking-tight">חלקים שמוצאים בעין</h2>
          <p className="text-muted">תמונה, מק״ט, צד ושנים — בלי לנחש. בלי מחיר באתר, רק הצעת מחיר.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-9 mb-4.5">
          <h2 className="text-[26px] tracking-tight">מה אומרים לקוחות</h2>
          <p className="text-muted">מצאו חלק לפי דגם ושנה, בלי לנחש.</p>
        </div>
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {reviews.map((r) => (
            <div key={r.name} className="rounded-xl border border-line bg-card p-4">
              <div className="mb-2 flex gap-0.5 text-accent-hot">
                {Array.from({ length: r.stars }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <p className="mb-3 leading-relaxed text-fg-soft">{r.text}</p>
              <strong>{r.name}</strong>
            </div>
          ))}
        </div>

        <FaqList items={[...faqs]} />
      </div>
    </>
  );
}

function Trust({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-line px-4 py-4 text-center text-sm font-bold lg:border-l">
      {k}
      <span className="mt-1 block text-xs font-normal text-muted">{v}</span>
    </div>
  );
}
