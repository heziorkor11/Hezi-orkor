import type { AdminRole } from "./types";

export const HERO_MASTER_ONLY_ERROR = "פעולה זו למאסטר בלבד";

export function canManageHomeHero(role: AdminRole | string | undefined): boolean {
  return role === "master";
}

export function heroMasterGuard(role: AdminRole | string | undefined): { ok: true } | { ok: false; status: 403; error: string } {
  if (canManageHomeHero(role)) return { ok: true };
  return { ok: false, status: 403, error: HERO_MASTER_ONLY_ERROR };
}
