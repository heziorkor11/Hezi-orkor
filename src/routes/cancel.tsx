import { FormEvent, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/lib/brand";
import { businessLegal, legalPublicPaths } from "@/lib/business-legal";
import { waLink } from "@/lib/catalog";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/cancel")({
  head: () => ({
    meta: [
      { title: pageTitle("ביטול עסקה") },
      {
        name: "description",
        content: pageDescription("שליחת הודעת ביטול עסקה לפי חוק הגנת הצרכן — טופס פשוט לוואטסאפ."),
      },
    ],
  }),
  component: CancelPage,
});

function CancelPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const msg = [
      "בקשת ביטול עסקה מהאתר",
      `שם: ${fd.get("name") || ""}`,
      `טלפון: ${fd.get("phone") || ""}`,
      `מספר הזמנה / פרטים: ${fd.get("order") || ""}`,
      `פירוט: ${fd.get("note") || ""}`,
    ].join("\n");
    window.open(waLink(msg), "_blank");
    setSent(true);
  }

  return (
    <LegalDoc
      slug="cancel"
      title="ביטול עסקה"
      summary="שלחו הודעת ביטול ברורה. ההודעה נפתחת בוואטסאפ ואינה נשמרת בשרת האתר — כמו טפסי יצירת הקשר באתר."
    >
      <form className="rounded-xl border border-line bg-card p-5" onSubmit={onSubmit} noValidate>
        <div className="grid gap-3">
          <FormField label="שם מלא *">
            <Input name="name" autoComplete="name" required />
          </FormField>
          <FormField label="טלפון *">
            <Input name="phone" autoComplete="tel" inputMode="tel" required />
          </FormField>
          <FormField label="מספר הזמנה או פרטי העסקה *">
            <Input name="order" required placeholder="מספר הזמנה, מק״ט או תאריך" />
          </FormField>
          <FormField label="פירוט נוסף">
            <textarea
              name="note"
              rows={4}
              className="w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent-hot focus:ring-2 focus:ring-accent/30 focus-visible:ring-2 focus-visible:ring-accent-hot/70"
              placeholder="סיבת הביטול, כתובת להחזרה…"
            />
          </FormField>
          <p className="text-xs text-muted">
            זכות הביטול לפי הדין מפורטת ב־
            <Link to={legalPublicPaths.returns} className="underline hover:text-fg">
              מדיניות ביטולים והחזרות
            </Link>
            . {businessLegal.vatNote}
          </p>
          <Button type="submit" variant="accent" className="inline-flex items-center justify-center gap-2">
            <WhatsAppIcon className="size-4" />
            שליחת הודעת ביטול בוואטסאפ
          </Button>
          {sent ? (
            <p className="text-sm text-ok" role="status">
              נפתח חלון וואטסאפ. אם לא נפתח, פנו ל־{brand.phone}.
            </p>
          ) : null}
        </div>
      </form>
    </LegalDoc>
  );
}
