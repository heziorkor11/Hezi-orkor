import { FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand, waLink } from "@/lib/catalog";
import { pageDescription, pageTitle } from "@/lib/seo";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: pageTitle("לא מצאתם חלק") },
      {
        name: "description",
        content: pageDescription(
          `לא מצאתם חלק בחזי אורקור? שלחו מספר רכב, מק״ט או תמונה בוואטסאפ ל־${brand.phone}.`,
        ),
      },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const msg = `שלום, לא מצאתי באתר.\nמספר רכב: ${fd.get("plate")}\nמק״ט: ${fd.get("sku")}\nחלק: ${fd.get("part")}`;
    window.open(waLink(msg), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-12">
      <div className="rounded-xl border border-line bg-card p-7 text-right">
        <h1 className="mb-2 text-2xl tracking-tight">לא מצאתם את החלק?</h1>
        <p className="leading-relaxed text-muted">
          זה נורמלי. שלחו מספר רכב, מק״ט מהחלק הישן, או תמונה — ונאתר התאמה. נחזור אליכם בוואטסאפ ל־
          {brand.phone}.
        </p>
        <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
          <FormField label="מספר רכב / לוחית">
            <Input name="plate" autoComplete="off" />
          </FormField>
          <FormField label="מק״ט או OE אם יש">
            <Input name="sku" autoComplete="off" />
          </FormField>
          <FormField label="איזה חלק צריך">
            <Input name="part" placeholder="למשל מדחס מזגן שמאל" />
          </FormField>
          <p className="text-xs text-muted">
            הפרטים נשלחים לוואטסאפ בלבד ואינם נשמרים בשרת האתר.{" "}
            <Link to="/legal/$slug" params={{ slug: "privacy" }} className="underline hover:text-fg">
              מדיניות פרטיות
            </Link>
          </p>
          <Button type="submit" variant="accent" size="lg">
            פתחו וואטסאפ עם הפרטים
          </Button>
        </form>
      </div>
    </div>
  );
}
