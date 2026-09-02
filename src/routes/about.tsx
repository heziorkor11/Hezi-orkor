import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Phone, Wrench } from "lucide-react";
import { FaqList } from "@/components/faq-list";
import { HoursWidget } from "@/components/hours-widget";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { brand, faqs } from "@/lib/catalog";
import { localBusinessJsonLd, pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: pageTitle("אודות") },
      {
        name: "description",
        content: pageDescription(
          `חזי אורקור בנהריה — חלקי חילוף ואביזרים לרכב לפי מק״ט, OE ויצרן-דגם-שנה. ${brand.address}.`,
        ),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-[800px] px-5 pt-10 pb-16">
      <JsonLd data={localBusinessJsonLd()} />
      <p className="mb-2 text-xs font-extrabold tracking-[0.28em] text-accent-warm">נהריה · הגליל המערבי</p>
      <h1 className="mb-3 text-3xl tracking-tight">מוסך וחלפים שמוצאים לפי מק״ט, לא לפי ניחוש</h1>
      <p className="mb-6 max-w-prose leading-relaxed text-fg-soft">
        {brand.nameHe} ב{brand.address} מספק חלקי חילוף, חשמל רכב ואביזרים למוסכים וללקוחות פרטיים.
        מחפשים פנס, רדיאטור, בולם או חיישן — לפי תמונה, מק״ט OE, או יצרן-דגם-שנה. בלי שלושה טלפונים.
      </p>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <MapPin className="mb-2 size-4 text-accent-hot" />
          <strong className="block">{brand.address}</strong>
          <span className="text-sm text-muted">איסוף עצמי בתיאום</span>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <Phone className="mb-2 size-4 text-accent-hot" />
          <strong className="block">{brand.phone}</strong>
          <span className="text-sm text-muted">וואטסאפ או שיחה</span>
        </div>
        <HoursWidget />
      </div>

      <h2 className="mb-2 text-2xl tracking-tight">מה עושים פה</h2>
      <ul className="mb-8 grid gap-2 text-fg-soft">
        <li className="flex gap-2">
          <Wrench className="mt-1 size-4 shrink-0 text-accent-hot" />
          התאמת חלק לפי רכב — סוג, יצרן, דגם ושנה
        </li>
        <li className="flex gap-2">
          <Wrench className="mt-1 size-4 shrink-0 text-accent-hot" />
          אישור מק״ט OE לפני הזמנה, כדי לא להחליף צד או שנה
        </li>
        <li className="flex gap-2">
          <Wrench className="mt-1 size-4 shrink-0 text-accent-hot" />
          איסוף מנהריה או משלוח לכל הארץ
        </li>
      </ul>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row">
        <Link to="/contact">
          <Button variant="accent">יצירת קשר ואיסוף</Button>
        </Link>
        <Link to="/help">
          <Button variant="ghost">לא מצאתם חלק?</Button>
        </Link>
      </div>

      <FaqList items={[...faqs]} />
    </div>
  );
}
