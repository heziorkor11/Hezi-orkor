import { useEffect, useState } from "react";
import { isWinterPromoActive } from "@/lib/winter-bundles";

/** Current time, ticking on the client only (SSR renders placeholders to avoid hydration drift). */
export function useNowTick(intervalMs = 15_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** True during SSR if active by server time; on the client, re-checked every tick so it hides itself at endAt. */
export function useWinterPromoActive(): boolean {
  const now = useNowTick();
  return isWinterPromoActive(now ?? new Date());
}
