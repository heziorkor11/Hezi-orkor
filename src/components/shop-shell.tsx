import { adminSnapshot } from "@/lib/admin/overlay";
import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { MobileTabBar } from "@/components/mobile-tabbar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/lib/brand";

export function ShopShell({ children }: { children: ReactNode }) {
  const path = useLocation({ select: (l) => l.pathname });
  if (path === "/admin" || path.startsWith("/admin/")) return <>{children}</>;
  return (
    <div className="has-mobile-tabbar flex min-h-dvh flex-col bg-paper text-fg">
      <a href="#main-content" className="skip-link">
        דלג לתוכן הראשי
      </a>
      <SiteHeader />
      {adminSnapshot().mode === "preview-demo" && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-950">
          מצב בדיקה · נתונים זמניים בלבד · אין להזין פרטי לקוחות אמיתיים
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
      <a
        href={`https://wa.me/${brand.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-3.5 z-float grid size-[52px] place-items-center rounded-full bg-whatsapp text-white shadow-[0_10px_24px_rgb(37_211_102_/_0.35)] hover:brightness-110 md:bottom-4 md:left-4 md:size-14"
        aria-label={`שליחת הודעה בוואטסאפ ל${brand.nameHe}, ${brand.phone}`}
      >
        <WhatsAppIcon className="size-7" aria-hidden />
      </a>
      <MobileTabBar />
      <Toaster theme="light" position="top-center" toastOptions={{ className: "font-sans" }} />
    </div>
  );
}
