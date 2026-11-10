import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { MobileTabBar } from "@/components/mobile-tabbar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteMenu } from "@/components/site-menu";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/lib/brand";

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="has-mobile-tabbar flex min-h-dvh flex-col bg-paper text-fg">
      <a href="#main-content" className="skip-link">
        דלג לתוכן הראשי
      </a>
      <SiteHeader />
      <SiteMenu />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <a
        href={`https://wa.me/${brand.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 z-float hidden size-14 place-items-center sq-tile bg-whatsapp text-white shadow-[0_10px_24px_rgb(37_211_102_/_0.35)] hover:brightness-110 md:grid"
        aria-label={`שליחת הודעה בוואטסאפ ל${brand.nameHe}, ${brand.phone}`}
      >
        <WhatsAppIcon className="size-7" aria-hidden />
      </a>
      <MobileTabBar />
      <Toaster theme="light" position="top-center" toastOptions={{ className: "font-sans" }} />
    </div>
  );
}
