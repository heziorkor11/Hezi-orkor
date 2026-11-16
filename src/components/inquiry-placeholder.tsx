import { Link } from "@tanstack/react-router";
import { HelpCircle, Wrench } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/lib/brand";
import type { ListingSearch } from "@/lib/catalog";
import {
  INQUIRY_LABEL,
  INQUIRY_STATUS,
  INQUIRY_TEXT,
  inquiryWhatsAppUrl,
  type InquiryPlaceholder,
  type InquiryVehicle,
} from "@/lib/inquiry-placeholders";
import { cn } from "@/lib/utils";

/** Vehicle as identified (plate mapping or the make/model/year the user picked). */
export function inquiryVehicle(state: ListingSearch, plate?: string): InquiryVehicle {
  return {
    plate,
    make: state.make,
    model: state.model,
    year: state.year,
  };
}

/** Generic illustration — muted so it never reads as the actual product. */
function InquiryArt({ item, className }: { item: InquiryPlaceholder; className?: string }) {
  return (
    <span
      className={cn(
        "relative grid place-items-center overflow-hidden bg-panel",
        className,
      )}
    >
      {item.image ? (
        <img
          src={item.image}
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-45 grayscale"
          loading="lazy"
          data-inquiry-generic-image
        />
      ) : (
        <Wrench className="size-10 text-muted" aria-hidden data-inquiry-neutral-icon />
      )}
      <span className="absolute top-1.5 right-1.5 rounded-full border border-line bg-card/95 px-2 py-0.5 text-[11px] font-bold text-muted">
        {INQUIRY_LABEL}
      </span>
      <span className="absolute bottom-1 left-1.5 text-[10px] font-semibold text-muted/90">
        תמונה להמחשה
      </span>
    </span>
  );
}

function WhatsAppButton({ href, compact }: { href: string; compact?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-inquiry-whatsapp
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border border-[#25D366]/60 bg-[#25D366]/10 font-bold text-fg transition-colors hover:bg-[#25D366]/20",
        compact ? "px-2.5 py-1.5 text-xs" : "px-4 py-2.5 text-sm",
      )}
    >
      <WhatsAppIcon className={compact ? "size-4 text-[#25D366]" : "size-5 text-[#25D366]"} />
      {compact ? "לברר בוואטסאפ" : "שלחו מספר רכב בוואטסאפ"}
    </a>
  );
}

/**
 * Overview rail: categories without a fitting product for the vehicle.
 * Not products — no price, no cart, no product link.
 */
export function InquiryRail({
  items,
  state,
  plate,
}: {
  items: InquiryPlaceholder[];
  state: ListingSearch;
  plate?: string;
}) {
  if (!items.length) return null;
  const vehicle = inquiryVehicle(state, plate);
  return (
    <section aria-label="חלקים לבירור" className="mb-6" data-inquiry-rail>
      <div className="mb-2 flex items-center gap-1.5">
        <HelpCircle className="size-4 text-muted" aria-hidden />
        <h2 className="text-base font-bold">חלקים לבירור לרכב שלך</h2>
      </div>
      <p className="mb-3 text-sm text-muted">
        לקטגוריות האלה אין לנו כרגע מוצר מאומת לרכב — צריך לברר. שלחו לנו מספר רכב ונבדוק.
      </p>
      <div className="home-h-scroll flex gap-3 overflow-x-auto pb-2" role="list">
        {items.map((item) => (
          <article
            key={item.categoryId}
            role="listitem"
            data-inquiry-card={item.categoryId}
            className="flex w-[152px] shrink-0 flex-col overflow-hidden rounded-xl border border-dashed border-line bg-card/70"
          >
            <Link
              to="/results"
              search={{ ...state, category: item.categoryId, sub: undefined, page: undefined }}
              className="block"
              aria-label={`${item.label} — ${INQUIRY_STATUS}`}
            >
              <InquiryArt item={item} className="aspect-square w-full" />
              <span className="block px-2.5 pt-2 text-sm font-bold text-fg">{item.label}</span>
              <span className="block px-2.5 text-xs font-semibold text-muted">
                {INQUIRY_STATUS} · ללא מחיר
              </span>
            </Link>
            <div className="mt-auto p-2.5">
              <WhatsAppButton href={inquiryWhatsAppUrl(brand.whatsapp, item.label, vehicle)} compact />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Drilled-in category with no fitting product: replaces the empty state. */
export function InquiryCard({
  item,
  state,
  plate,
}: {
  item: InquiryPlaceholder;
  state: ListingSearch;
  plate?: string;
}) {
  const vehicle = inquiryVehicle(state, plate);
  const car = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ");
  return (
    <article
      data-inquiry-card={item.categoryId}
      className="mx-auto flex max-w-md flex-col overflow-hidden rounded-xl border border-dashed border-line bg-card/70"
    >
      <InquiryArt item={item} className="aspect-[4/3] w-full" />
      <div className="flex flex-col gap-2 p-4 text-center">
        <h2 className="text-lg font-bold">{item.label}</h2>
        {car ? <p className="text-sm font-semibold text-fg">{car}</p> : null}
        <p className="text-sm font-bold text-accent-warm">{INQUIRY_STATUS}</p>
        <p className="text-sm text-muted">{INQUIRY_TEXT}. שלחו לנו מספר רכב ונבדוק בשבילכם.</p>
        <p className="text-xs text-muted">ללא מחיר · לא ניתן להוסיף לסל</p>
        <div className="mt-1 flex justify-center">
          <WhatsAppButton href={inquiryWhatsAppUrl(brand.whatsapp, item.label, vehicle)} />
        </div>
      </div>
    </article>
  );
}
