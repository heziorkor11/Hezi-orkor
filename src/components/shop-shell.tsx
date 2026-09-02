import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/lib/catalog";

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-fg">
      <a href="#main-content" className="skip-link">
        דלג לתוכן הראשי
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <a
        href={`https://wa.me/${brand.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 z-float grid size-14 place-items-center rounded-full bg-whatsapp text-ink shadow-[0_10px_24px_rgb(37_211_102_/_0.35)] hover:brightness-110"
        aria-label={`שליחת הודעה בוואטסאפ ל${brand.nameHe}, ${brand.phone}`}
      >
        <WhatsAppIcon className="size-7" aria-hidden />
      </a>
      <Toaster theme="dark" position="top-center" toastOptions={{ className: "font-sans" }} />
    </div>
  );
}
