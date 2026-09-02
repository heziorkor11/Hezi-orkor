import { FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Phone } from "lucide-react";
import { FormField } from "@/components/form-field";
import { HoursWidget } from "@/components/hours-widget";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand, waLink } from "@/lib/catalog";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: pageTitle("יצירת קשר") },
      {
        name: "description",
        content: pageDescription(
          `צרו קשר עם חזי אורקור בנהריה: ${brand.address}. טלפון ${brand.phone}, ${brand.hours}. וואטסאפ לאישור חלק.`,
        ),
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const maps = `https://maps.google.com/?q=${encodeURIComponent(brand.mapsQuery)}`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const msg = `שלום, פנייה מהאתר.\nשם: ${fd.get("name")}\nטלפון: ${fd.get("phone")}\nהודעה: ${fd.get("note")}`;
    window.open(waLink(msg), "_blank");
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "יצירת קשר | חזי אורקור",
    mainEntity: {
      "@type": "AutoPartsStore",
      name: brand.nameHe,
      telephone: `+${brand.phoneTel}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: brand.street,
        addressLocality: brand.city,
        addressCountry: "IL",
      },
    },
  };

  return (
    <div className="mx-auto max-w-[960px] px-5 pt-10 pb-16">
      <JsonLd data={jsonLd} />
      <h1 className="mb-2 text-3xl tracking-tight">יצירת קשר</h1>
      <p className="mb-7 max-w-prose leading-relaxed text-muted">
        מדברים עם אדם, לא עם טופס מת. וואטסאפ הכי מהיר — אפשר גם להתקשר או לאסוף מנהריה.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <MapPin className="size-4 text-accent-hot" />
              כתובת
            </div>
            <p className="font-semibold">{brand.address}</p>
            <a href={maps} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-accent-hot underline">
              פתיחה במפות
            </a>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted">
              <Phone className="size-4 text-accent-hot" />
              טלפון
            </div>
            <a href={`tel:${brand.phoneTel}`} className="font-semibold hover:underline">
              {brand.phone}
            </a>
          </div>
          <HoursWidget />
          <a
            href={waLink("שלום, רציתי לבדוק התאמת חלק")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-whatsapp px-4 text-sm font-semibold text-ink hover:brightness-110"
          >
            <WhatsAppIcon className="size-4" />
            וואטסאפ
          </a>
          <p className="text-sm text-muted">
            מחפשים חלק ספציפי?{" "}
            <Link to="/help" className="text-accent-hot underline">
              טופס לפי מספר רכב
            </Link>
          </p>
        </div>

        <div className="space-y-4">
          <form className="rounded-xl border border-line bg-card p-5" onSubmit={onSubmit}>
            <h2 className="mb-3 text-lg font-semibold">שליחה בוואטסאפ</h2>
            <div className="grid gap-3">
              <FormField label="שם">
                <Input name="name" autoComplete="name" required />
              </FormField>
              <FormField label="טלפון">
                <Input name="phone" autoComplete="tel" inputMode="tel" required />
              </FormField>
              <FormField label="מה צריך">
                <textarea
                  name="note"
                  rows={4}
                  placeholder="מק״ט, דגם, שנה…"
                  className="w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent-hot focus:ring-2 focus:ring-accent/30"
                />
              </FormField>
              <p className="text-xs text-muted">
                ההודעה נפתחת בוואטסאפ ואינה נשמרת בשרת האתר.{" "}
                <Link to="/legal/$slug" params={{ slug: "privacy" }} className="underline hover:text-fg">
                  מדיניות פרטיות
                </Link>
              </p>
              <Button type="submit" variant="accent">
                שליחה לוואטסאפ
              </Button>
            </div>
          </form>
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-56 flex-col items-start justify-end rounded-xl border border-line bg-[radial-gradient(400px_180px_at_80%_0%,rgb(226_59_18_/_0.18),transparent),linear-gradient(180deg,#1a1410,#0e0c0b)] p-5 hover:border-accent"
          >
            <MapPin className="mb-3 size-6 text-accent-hot" />
            <strong className="text-lg text-fg">{brand.address}</strong>
            <span className="mt-1 text-sm text-accent-warm">ניווט במפות גוגל</span>
          </a>
        </div>
      </div>
    </div>
  );
}
