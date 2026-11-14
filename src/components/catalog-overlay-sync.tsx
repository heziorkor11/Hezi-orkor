import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setPublicOverlay } from "@/lib/admin/public-overlay";
import type { PublicOverlay } from "@/lib/admin/types";

const OverlayRev = createContext(0);

/** Subscribe in views that read live catalog overrides so they re-render after a fetch. */
export function useCatalogOverlayRev() {
  return useContext(OverlayRev);
}

/** Pull live admin overrides (tags, prices, names, deals) and re-render the tree when they arrive. */
export function CatalogOverlaySync({ children }: { children?: ReactNode }) {
  const [rev, setRev] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/catalog-overlay", { credentials: "same-origin" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as PublicOverlay;
        if (cancelled || !data || typeof data !== "object") return;
        setPublicOverlay(data);
        setRev((n) => n + 1);
      } catch {
        /* bundled catalog stays in effect */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <OverlayRev.Provider value={rev}>{children}</OverlayRev.Provider>;
}
