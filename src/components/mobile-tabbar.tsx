import { Link, useRouterState } from "@tanstack/react-router";
import { Grid2x2, Home, MessageCircle, Search } from "lucide-react";
import { brand } from "@/lib/brand";
import { useSiteMenu } from "@/lib/menu-store";
import { cn } from "@/lib/utils";

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const homeOn = pathname === "/";
  const searchOn = pathname.startsWith("/results");
  const setMenuOpen = useSiteMenu((s) => s.setOpen);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[70] flex h-[calc(4rem+env(safe-area-inset-bottom,0px))] border-t border-line bg-panel pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      aria-label="ניווט תחתון"
    >
      <Link
        to="/"
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-muted",
          homeOn && "text-accent",
        )}
      >
        <Home className="size-[18px]" strokeWidth={2.25} aria-hidden />
        בית
      </Link>
      <Link
        to="/results"
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-muted",
          searchOn && "text-accent",
        )}
      >
        <Search className="size-[18px]" strokeWidth={2.25} aria-hidden />
        חיפוש
      </Link>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-muted"
      >
        <Grid2x2 className="size-[18px]" strokeWidth={2.25} aria-hidden />
        קטגוריות
      </button>
      <a
        href={`https://wa.me/${brand.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold text-muted"
      >
        <MessageCircle className="size-[18px]" strokeWidth={2.25} aria-hidden />
        וואטסאפ
      </a>
    </nav>
  );
}
