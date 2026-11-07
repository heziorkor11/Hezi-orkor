import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { refreshAdminOverlay } from "@/lib/admin/overlay";
/** Public projection only. Never reads admin sessions, users, customer records or audit. */
export function AdminOverlaySync() {
  const router = useRouter();
  useEffect(() => {
    let busy = false;
    const sync = async () => {
      if (busy) return;
      busy = true;
      try {
        await refreshAdminOverlay();
        await router.invalidate();
      } catch {
        /* Keep the last known view; no base data are overwritten. */
      } finally {
        busy = false;
      }
    };
    void sync();
    window.addEventListener("focus", sync);
    const timer = window.setInterval(sync, 60_000);
    return () => {
      window.removeEventListener("focus", sync);
      clearInterval(timer);
    };
  }, [router]);
  return null;
}
