import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { brand } from "@/lib/catalog";

export function ShopShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-fg">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <a
        href={`https://wa.me/${brand.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        title="וואטסאפ"
        className="fixed bottom-4 left-4 z-float grid size-14 place-items-center rounded-full bg-whatsapp text-ink shadow-[0_10px_24px_rgb(37_211_102_/_0.35)] hover:brightness-110"
      >
        <WhatsAppIcon className="size-7" />
        <span className="sr-only">וואטסאפ</span>
      </a>
      <Toaster theme="dark" position="top-center" toastOptions={{ className: "font-sans" }} />
    </div>
  );
}
