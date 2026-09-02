import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { brand } from "@/lib/catalog";
import { shopStatus, type ShopStatus } from "@/lib/hours";

export function HoursWidget({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<ShopStatus | null>(null);

  useEffect(() => {
    setStatus(shopStatus());
    const id = window.setInterval(() => setStatus(shopStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={
        compact
          ? "flex items-center gap-2 text-sm"
          : "rounded-xl border border-line bg-card p-4"
      }
    >
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-accent-hot" aria-hidden />
        <strong className="text-fg">{brand.hours}</strong>
      </div>
      {status ? (
        <p className={compact ? "text-muted" : "mt-1 text-sm"} aria-live="polite">
          <span className={status.open ? "font-semibold text-ok" : "font-semibold text-accent-warm"}>
            {status.label}
          </span>
          <span className="text-muted"> · {status.next}</span>
        </p>
      ) : (
        <p className={compact ? "text-muted" : "mt-1 text-sm text-muted"}>א׳–ה׳, שעון ישראל</p>
      )}
    </div>
  );
}
