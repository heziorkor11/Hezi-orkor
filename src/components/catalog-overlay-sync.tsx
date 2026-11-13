import { useEffect } from "react";
import { mergeOverlay } from "@/lib/admin/public-overlay";

/** Pull live admin overrides (tags, prices, deals) without waiting for a redeploy. */
export function CatalogOverlaySync() {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/catalog-overlay", { credentials: "same-origin" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as Record<string, unknown>;
        if (!cancelled && data && typeof data === "object") mergeOverlay(data);
      } catch {
        /* bundled catalog stays in effect */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
