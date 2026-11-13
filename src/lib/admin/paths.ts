/** Canonical admin home (index route in the route tree is `/admin/`). */
export const ADMIN_HOME = "/admin" as const;
export const ADMIN_LOGIN = "/admin/login" as const;

/**
 * Collapse accidental double slashes and `/admin/admin` prefixing that TanStack
 * Router can produce when a `to: "/admin"` link is resolved from `/admin/`.
 */
export function normalizeAdminPath(pathname: string): string {
  if (!pathname.startsWith("/admin")) return pathname;
  let next = pathname.replace(/\/{2,}/g, "/");
  while (/^\/admin\/admin(?=\/|$)/.test(next)) {
    next = next.replace(/^\/admin\/admin/, "/admin");
  }
  next = next.replace(/\/{2,}/g, "/");
  if (next === "/admin" || next === "/admin/") return ADMIN_HOME;
  return next;
}

export function isAdminHomePath(pathname: string): boolean {
  return pathname === "/admin" || pathname === "/admin/" || pathname === ADMIN_HOME;
}
