import { createServerFn } from "@tanstack/react-start";

/** Load live admin catalog overrides before a storefront loader reads products/deals. */
export const bootAdminOverlay = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureAdminOverlay } = await import("@/lib/admin/storage.server");
  await ensureAdminOverlay();
  return true as const;
});
