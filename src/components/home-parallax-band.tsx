import { brand } from "@/lib/brand";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

/** Fixed-background CTA band with iOS-safe fallback (no background-attachment:fixed). */
export function HomeParallaxBand() {
  const href = `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent("שלום, לא מצאתי חלק באתר — מצורפת תמונה/מק״ט")}`;
  return (
    <section className="home-parallax-band sq-card relative mx-3.5 mt-10 overflow-hidden md:mx-5">
      <div className="home-parallax-bg" aria-hidden />
      <div className="relative z-[1] flex flex-col items-start gap-3 px-5 py-12 text-white md:px-10 md:py-16">
        <h2 className="text-2xl font-black tracking-tight md:text-3xl">לא מצאת חלק?</h2>
        <p className="max-w-lg text-sm text-white/90 md:text-base">
          שלחו לנו תמונה או מק״ט בוואטסאפ — נאתר את החלק ונחזור עם הצעת מחיר.
        </p>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="sq-btn inline-flex items-center gap-2 bg-whatsapp px-5 py-3 text-sm font-extrabold text-white shadow-lg hover:brightness-110"
        >
          <WhatsAppIcon className="size-5" aria-hidden />
          שלח לנו תמונה בוואטסאפ
        </a>
      </div>
    </section>
  );
}
